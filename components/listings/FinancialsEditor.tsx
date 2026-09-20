"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateListingFinancials } from "@/app/(app)/listings/actions";
import { financialsHaveContent, normalizeFinancials } from "@/lib/listings/crm-marketing-fields";
import { GATED_EDITOR_FIELDS } from "@/lib/listings/gated-underwriting";
import type { ListingFinancials } from "@/types/database";

const inputClass = "w-full rounded-lg border border-neutral-200 px-2.5 py-1.5 text-sm";

const PLACEHOLDERS: Record<(typeof GATED_EDITOR_FIELDS)[number]["key"], string> = {
  purchase_price: "400000",
  gross_rents: "5124",
  net_earnings: "4442",
  opex: "1007",
  noi: "3435",
  projected_debt_service: "2129",
  net_cash_flow: "1306",
  cash_on_cash: "19.6%",
  cap_rate: "10.3%",
  dscr: "1.61",
};

// The gated underwriting detail behind the public page's unlock form.
// Dollar fields here are T12 monthly averages (Vera Apply already ÷12).
// The public OM formats them as currency without dividing again. Ratios
// and purchase_price stay as entered. Annual totals live on
// financials.annual + the workbook. T12 / scenarios stay in JSONB when
// Apply-to-OM writes them, but they are not edited here.
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
        {GATED_EDITOR_FIELDS.map((field) => (
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
      <p className="text-xs text-neutral-400">
        Dollar rows are T12 monthly averages. Annual totals stay on the sidecar <code>financials.annual</code> object and the
        buyer workbook. Leaving everything blank hides the underwriting section on the public page.
      </p>
    </div>
  );
}
