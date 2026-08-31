"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { deriveInvestorMetrics, type InvestorMetrics } from "@/lib/crm/house-hack-calc";
import { isWithinQuietHours } from "@/lib/crm/warm-notifications";
import { notifyNewLead } from "@/lib/push/send-push";

const OWNER_ID = process.env.CRM_OWNER_USER_ID;

// Public, unauthenticated by design - the link she texts/emails opens on
// the recipient's own phone, no login. Same pattern as
// app/checkin/[series]/actions.ts: every action here goes through the
// admin client scoped to the single owner account, not a user session.
const SLUG_FORMAT = /^[A-Za-z0-9_-]{8}$/;

// A same-tab reload/strict-mode double-fire shouldn't count as a second
// view; a genuinely later visit (new tab, reopened later) should.
const DEDUPE_WINDOW_MINUTES = 5;

export type PublicQuoteView = {
  clientFirstName: string;
  propertyAddress: string;
  propertyDescription: string;
  purchasePrice: number;
  monthlyPrincipalInterest: number;
  monthlyTaxesInsurance: number;
  monthlyMortgageInsurance: number;
  monthlyMaintenance: number;
  monthlyRentCredit: number;
  monthlyOutOfPocket: number;
  cashToClose: number;
  bothSidesRentedOutOfPocket: number | null;
  comparisonDelta: number | null;
  investor: InvestorMetrics | null;
};

export async function getPublicQuote(slug: string): Promise<PublicQuoteView | null> {
  if (!OWNER_ID || !SLUG_FORMAT.test(slug)) return null;

  const admin = createAdminClient();
  const { data: quote } = await admin.from("quotes").select("*").eq("owner_id", OWNER_ID).eq("slug", slug).maybeSingle();
  if (!quote) return null;

  const investor = deriveInvestorMetrics({
    purchasePrice: quote.purchase_price,
    rentFromOtherUnit: quote.rent_from_other_unit,
    taxesAnnual: quote.taxes_annual,
    insuranceAnnual: quote.insurance_annual,
    monthlyMaintenance: quote.monthly_maintenance,
    monthlyPrincipalInterest: quote.monthly_principal_interest,
    monthlyMortgageInsurance: quote.monthly_mortgage_insurance,
    cashToClose: quote.cash_to_close,
  });

  return {
    clientFirstName: quote.client_first_name,
    propertyAddress: quote.property_address,
    propertyDescription: quote.property_description,
    purchasePrice: quote.purchase_price,
    monthlyPrincipalInterest: quote.monthly_principal_interest,
    monthlyTaxesInsurance: quote.monthly_taxes_insurance,
    monthlyMortgageInsurance: quote.monthly_mortgage_insurance,
    monthlyMaintenance: quote.monthly_maintenance,
    monthlyRentCredit: quote.rent_from_other_unit ?? 0,
    monthlyOutOfPocket: quote.monthly_out_of_pocket,
    cashToClose: quote.cash_to_close,
    bothSidesRentedOutOfPocket: quote.both_sides_rented_out_of_pocket,
    comparisonDelta: quote.renting_now == null ? null : quote.renting_now - quote.monthly_out_of_pocket,
    investor,
  };
}

export async function recordQuoteView(slug: string, visitorKey: string): Promise<void> {
  if (!OWNER_ID || !SLUG_FORMAT.test(slug) || !visitorKey) return;

  const admin = createAdminClient();
  const { data: quote } = await admin.from("quotes").select("id, contact_id, client_first_name, property_address").eq("owner_id", OWNER_ID).eq("slug", slug).maybeSingle();
  if (!quote) return;

  const dedupeSince = new Date(Date.now() - DEDUPE_WINDOW_MINUTES * 60 * 1000).toISOString();
  const { data: recent } = await admin
    .from("quote_views")
    .select("id")
    .eq("quote_id", quote.id)
    .eq("visitor_key", visitorKey)
    .gte("viewed_at", dedupeSince)
    .limit(1);
  if (recent && recent.length > 0) return;

  await admin.from("quote_views").insert({ quote_id: quote.id, visitor_key: visitorKey });

  if (!isWithinQuietHours()) return;

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin.from("quote_views").select("id", { count: "exact", head: true }).eq("quote_id", quote.id).gte("viewed_at", since24h);

  const url = quote.contact_id ? `/contacts/${quote.contact_id}` : "/numbers";
  const name = quote.client_first_name || "Someone";
  const address = quote.property_address ? ` for ${quote.property_address}` : "";

  if (count === 1) {
    await notifyNewLead(admin, OWNER_ID, { title: name, body: `Opened the numbers you sent${address}`, url });
  } else if (count === 2) {
    await notifyNewLead(admin, OWNER_ID, { title: name, body: "Opened it twice today - might be worth a follow-up", url });
  }
}
