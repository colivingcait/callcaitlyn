"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { updateListingFinancials } from "@/app/(app)/listings/actions";
import type { ListingFinancials } from "@/types/database";

const inputClass = "w-full rounded-lg border border-neutral-200 px-2.5 py-1.5 text-sm";

const EMPTY: ListingFinancials = {
  t12: [],
  noi: "",
  cap_rate: "",
  vacancy_pct: "",
  occupancy_summary: "",
  scenarios: [],
};

// The gated underwriting detail behind the public page's unlock form -
// every line here only ever reaches a visitor's browser after they submit
// contact info (see FinancialGate.tsx), never in the locked page's HTML.
export function FinancialsEditor({ listingId, financials }: { listingId: string; financials: ListingFinancials | null }) {
  const router = useRouter();
  const [data, setData] = useState<ListingFinancials>(financials ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const hasContent = data.t12.length > 0 || data.noi || data.cap_rate;
    await updateListingFinancials(listingId, hasContent ? data : null);
    setSaving(false);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 1500);
  }

  function updateLine(i: number, patch: Partial<ListingFinancials["t12"][number]>) {
    setData((d) => ({ ...d, t12: d.t12.map((line, idx) => (idx === i ? { ...line, ...patch } : line)) }));
  }
  function updateScenario(i: number, patch: Partial<ListingFinancials["scenarios"][number]>) {
    setData((d) => ({ ...d, scenarios: d.scenarios.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) }));
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-900">T12 line items</h3>
          <button
            type="button"
            onClick={() => setData((d) => ({ ...d, t12: [...d.t12, { label: "", value: "" }] }))}
            className="flex items-center gap-1 text-xs font-semibold text-brand-600"
          >
            <Plus size={13} /> Add line
          </button>
        </div>
        <div className="space-y-2">
          {data.t12.map((line, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={line.label} onChange={(e) => updateLine(i, { label: e.target.value })} placeholder="Label" className={`${inputClass} flex-1`} />
              <input value={line.value} onChange={(e) => updateLine(i, { value: e.target.value })} placeholder="$98,592" className={`${inputClass} w-32`} />
              <label className="flex shrink-0 items-center gap-1 text-xs text-neutral-500">
                <input type="checkbox" checked={!!line.subtotal} onChange={(e) => updateLine(i, { subtotal: e.target.checked })} />
                Subtotal
              </label>
              <button type="button" onClick={() => setData((d) => ({ ...d, t12: d.t12.filter((_, idx) => idx !== i) }))} className="shrink-0 text-neutral-400">
                <X size={15} />
              </button>
            </div>
          ))}
          {data.t12.length === 0 && <p className="text-xs text-neutral-400">No line items yet.</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">NOI</label>
          <input value={data.noi} onChange={(e) => setData((d) => ({ ...d, noi: e.target.value }))} placeholder="$56,892" className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Cap rate</label>
          <input value={data.cap_rate} onChange={(e) => setData((d) => ({ ...d, cap_rate: e.target.value }))} placeholder="14.8%" className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Vacancy %</label>
          <input value={data.vacancy_pct ?? ""} onChange={(e) => setData((d) => ({ ...d, vacancy_pct: e.target.value }))} placeholder="8.0%" className={inputClass} />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-900">Financing scenarios</h3>
          <button
            type="button"
            onClick={() =>
              setData((d) => ({ ...d, scenarios: [...d.scenarios, { label: "", coc: "", cash_in: "", debt_service: "", cash_flow: "" }] }))
            }
            className="flex items-center gap-1 text-xs font-semibold text-brand-600"
          >
            <Plus size={13} /> Add scenario
          </button>
        </div>
        <div className="space-y-3">
          {data.scenarios.map((s, i) => (
            <div key={i} className="rounded-xl border border-neutral-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <input value={s.label} onChange={(e) => updateScenario(i, { label: e.target.value })} placeholder="25% DOWN · 7.25% · 30-YR" className={`${inputClass} flex-1`} />
                <button type="button" onClick={() => setData((d) => ({ ...d, scenarios: d.scenarios.filter((_, idx) => idx !== i) }))} className="ml-2 shrink-0 text-neutral-400">
                  <X size={15} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <input value={s.coc} onChange={(e) => updateScenario(i, { coc: e.target.value })} placeholder="CoC 30.7%" className={inputClass} />
                <input value={s.cash_in} onChange={(e) => updateScenario(i, { cash_in: e.target.value })} placeholder="Cash in" className={inputClass} />
                <input value={s.debt_service} onChange={(e) => updateScenario(i, { debt_service: e.target.value })} placeholder="Debt service" className={inputClass} />
                <input value={s.cash_flow} onChange={(e) => updateScenario(i, { cash_flow: e.target.value })} placeholder="Cash flow" className={inputClass} />
              </div>
            </div>
          ))}
          {data.scenarios.length === 0 && <p className="text-xs text-neutral-400">No scenarios yet.</p>}
        </div>
      </div>

      <button type="button" onClick={handleSave} disabled={saving} className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {saving ? "Saving…" : saved ? "Saved" : "Save financials"}
      </button>
      <p className="text-xs text-neutral-400">Leaving everything blank hides the underwriting section on the public page entirely.</p>
    </div>
  );
}
