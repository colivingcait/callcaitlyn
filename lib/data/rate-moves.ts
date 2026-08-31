import { createClient } from "@/lib/supabase/server";
import { recomputePrincipalInterest, loanAmountForPayment } from "@/lib/crm/house-hack-calc";
import { isDismissedWithin } from "@/lib/crm/dismissed-insights";
import { RATE_PRODUCT } from "@/lib/crm/rate-feed";
import { fullName } from "@/lib/utils";
import type { LoanType } from "@/types/database";

// A quarter point or more, and only worth showing if it actually changes
// the monthly number by something real - a rate move that only shaves a
// few dollars off isn't worth interrupting anyone's day for.
const RATE_MOVE_THRESHOLD_PCT = 0.25;
const MONTHLY_DELTA_THRESHOLD = 50;
const DISMISS_WINDOW_DAYS = 30;
const DISMISS_KEY = "rate_move";

export type RateMove = {
  quoteId: string;
  contactId: string;
  contactName: string;
  phone: string | null;
  email: string | null;
  propertyAddress: string;
  originalPayment: number;
  originalQuotedAt: string;
  newPayment: number;
  monthlyDelta: number;
  ceiling: { originalPrice: number; newCeiling: number } | null;
};

export type RateMoveSummary = {
  currentRatePct: number;
  previousRatePct: number;
  moves: RateMove[];
};

export async function getRateMoves(): Promise<RateMoveSummary | null> {
  const supabase = await createClient();

  const { data: rates } = await supabase
    .from("daily_rates")
    .select("rate_pct, rate_date")
    .eq("product", RATE_PRODUCT)
    .order("rate_date", { ascending: false })
    .limit(60);
  if (!rates || rates.length === 0) return null;

  const current = rates[0];
  // The last DISTINCT value on file, not literally the prior row - the
  // feed can (and often will) record the same rate on consecutive days.
  const previous = rates.find((r) => r.rate_pct !== current.rate_pct);
  if (!previous) return null;
  if (Math.abs(current.rate_pct - previous.rate_pct) < RATE_MOVE_THRESHOLD_PCT) return null;

  const [{ data: quotes }, { data: dismissals }] = await Promise.all([
    supabase.from("quotes").select("*").not("contact_id", "is", null).order("created_at", { ascending: false }),
    supabase.from("dismissed_insights").select("contact_id, dismissed_at").eq("insight_key", DISMISS_KEY),
  ]);
  if (!quotes || quotes.length === 0) return null;

  const dismissedAt = new Map<string, string>();
  for (const d of dismissals ?? []) if (d.contact_id) dismissedAt.set(d.contact_id, d.dismissed_at);

  // Most recent quote per contact only - "you quoted him three weeks ago"
  // means the latest one, not every quote he's ever gotten.
  const latestByContact = new Map<string, (typeof quotes)[number]>();
  for (const q of quotes) {
    if (!latestByContact.has(q.contact_id as string)) latestByContact.set(q.contact_id as string, q);
  }

  const contactIds = [...latestByContact.keys()];
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, phone, email, budget_max, archived, known_personally")
    .in("id", contactIds);
  const contactById = new Map((contacts ?? []).map((c) => [c.id, c]));

  const moves: RateMove[] = [];
  for (const [contactId, quote] of latestByContact) {
    if (isDismissedWithin(dismissedAt.get(contactId), DISMISS_WINDOW_DAYS)) continue;

    const contact = contactById.get(contactId);
    if (!contact || contact.archived || contact.known_personally) continue;

    const loanType = quote.loan_type as LoanType;
    const newPrincipalInterest = recomputePrincipalInterest(quote.loan_amount, current.rate_pct, loanType);
    const newPayment =
      newPrincipalInterest + quote.monthly_taxes_insurance + quote.monthly_mortgage_insurance + quote.monthly_maintenance - (quote.rent_from_other_unit ?? 0);
    const monthlyDelta = quote.monthly_out_of_pocket - newPayment;
    if (monthlyDelta < MONTHLY_DELTA_THRESHOLD) continue;

    // "Ceiling" framing when she's got a stated budget ceiling for this
    // contact: at the new rate, the SAME payment already discussed
    // supports a bigger loan - solved as the algebraic inverse of the
    // amortization formula, not a live recompute against a new price.
    let ceiling: RateMove["ceiling"] = null;
    if (contact.budget_max) {
      const newLoanAmount = loanAmountForPayment(quote.monthly_principal_interest, current.rate_pct, loanType);
      const newCeiling = newLoanAmount / (1 - quote.down_payment_pct / 100);
      if (newCeiling - quote.purchase_price >= 1000) {
        ceiling = { originalPrice: contact.budget_max, newCeiling };
      }
    }

    moves.push({
      quoteId: quote.id,
      contactId,
      contactName: fullName(contact),
      phone: contact.phone,
      email: contact.email,
      propertyAddress: quote.property_address,
      originalPayment: quote.monthly_out_of_pocket,
      originalQuotedAt: quote.created_at,
      newPayment,
      monthlyDelta,
      ceiling,
    });
  }

  moves.sort((a, b) => b.monthlyDelta - a.monthlyDelta);
  if (moves.length === 0) return null;

  return { currentRatePct: current.rate_pct, previousRatePct: previous.rate_pct, moves };
}
