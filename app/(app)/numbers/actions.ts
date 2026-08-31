"use server";

import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeHouseHack } from "@/lib/crm/house-hack-calc";
import { baseUrl } from "@/lib/crm/sequences";
import type { LoanType } from "@/types/database";

const SLUG_ATTEMPTS = 5;

function generateSlug(): string {
  return randomBytes(6).toString("base64url");
}

export type SaveQuoteInput = {
  contactId: string | null;
  clientFirstName: string;
  propertyAddress: string;
  propertyDescription: string;
  purchasePrice: number;
  downPaymentPct: number;
  interestRatePct: number;
  loanType: LoanType;
  rentFromOtherUnit: number | null;
  rentingNow: number | null;
  taxesAnnual: number;
  insuranceAnnual: number;
};

// Quotes are immutable once saved - this always inserts a new row, never
// updates an existing one. Editing inputs after a save and saving again
// produces a new slug/link, so a link already sent keeps meaning exactly
// what it meant when it was sent.
export async function saveQuote(input: SaveQuoteInput): Promise<{ ok: true; quoteId: string; slug: string; link: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  if (!input.purchasePrice || input.purchasePrice <= 0) return { ok: false, error: "Enter a purchase price" };

  const breakdown = computeHouseHack({
    purchasePrice: input.purchasePrice,
    downPaymentPct: input.downPaymentPct,
    interestRatePct: input.interestRatePct,
    loanType: input.loanType,
    rentFromOtherUnit: input.rentFromOtherUnit,
    taxesAnnual: input.taxesAnnual,
    insuranceAnnual: input.insuranceAnnual,
    rentingNow: input.rentingNow,
  });

  const admin = createAdminClient();
  const row = {
    owner_id: user.id,
    contact_id: input.contactId,
    client_first_name: input.clientFirstName.trim(),
    property_address: input.propertyAddress.trim(),
    property_description: input.propertyDescription.trim(),
    purchase_price: input.purchasePrice,
    down_payment_pct: input.downPaymentPct,
    interest_rate_pct: input.interestRatePct,
    loan_type: input.loanType,
    rent_from_other_unit: input.rentFromOtherUnit,
    renting_now: input.rentingNow,
    taxes_annual: input.taxesAnnual,
    insurance_annual: input.insuranceAnnual,
    loan_amount: breakdown.loanAmount,
    monthly_principal_interest: breakdown.monthlyPrincipalInterest,
    monthly_taxes_insurance: breakdown.monthlyTaxesInsurance,
    monthly_mortgage_insurance: breakdown.monthlyMortgageInsurance,
    monthly_maintenance: breakdown.monthlyMaintenance,
    monthly_out_of_pocket: breakdown.monthlyOutOfPocket,
    cash_to_close: breakdown.cashToClose,
    both_sides_rented_out_of_pocket: breakdown.bothSidesRentedOutOfPocket,
  };

  for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt++) {
    const slug = generateSlug();
    const { data, error } = await admin.from("quotes").insert({ ...row, slug }).select("id").single();
    if (!error && data) return { ok: true, quoteId: data.id as string, slug, link: `${baseUrl()}/n/${slug}` };
    if (error && error.code !== "23505") return { ok: false, error: "Couldn't save that quote" };
  }

  return { ok: false, error: "Couldn't generate a unique link - try again" };
}
