"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateListingFinancials } from "@/app/(app)/listings/actions";
import { financialsHaveContent, normalizeFinancials } from "@/lib/listings/crm-marketing-fields";
import { GATED_UNDERWRITING_FIELDS } from "@/lib/listings/gated-underwriting";
import type { ListingFinancials } from "@/types/database";

const inputClass = "w-full rounded-lg border border-neutral-200 px-2.5 py-1.5 text-sm";

const PLACEHOLDERS: Record<(typeof GATED_UNDERWRITING_FIELDS)[number]["key"], string> = {
  purchase_price: "400000",
  gross_rents: "61483",
  padsplit_fees: "8178",
  net_earnings: "53305",
  opex: "12088",
  projected_debt_service: "25548",
  cash_on_cash: "19.6%",
  cap_rate: "10.3%",
  dscr: "1.61",
};

// The gated underwriting detail behind the public page's unlock form.
// Only these fields reach a visitor after they submit contact info
// (see FinancialGate.tsx). T12 / scenarios / pm fees stay in JSONB when
// Apply-to-OM writes them so the numbers can hydrate these keys, but they
// are not edited or shown here.
export function FinancialsEditor({ listingId, financials }: { listingId: string; financials: ListingFinancials | null }) {
  const router = useRouter();
  const [data, setData] = useState<ListingFinancials>(() => normalizeFinancials(financials));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await updateListingFinancials(listingId, financialsHaveContent(data) ? data : null);
    setSaving(false);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {GATED_UNDERWRITING_FIELDS.map((field) => (
          <div key={field.key}>
            <label className="mb-1 block text-sm font-medium text-neutral-700">{field.label}</label>
            <input
              value={data[field.key] ?? ""}
              onChange={(e) => setData((d) => ({ ...d, [field.key]: e.target.value }))}
              placeholder={PLACEHOLDERS[field.key]}
              className={inputClass}
            />
          </div>
        ))}
      </div>

      <button type="button" onClick={handleSave} disabled={saving} className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {saving ? "Saving…" : saved ? "Saved" : "Save financials"}
      </button>
      <p className="text-xs text-neutral-400">Leaving everything blank hides the underwriting section on the public page entirely.</p>
    </div>
  );
}
