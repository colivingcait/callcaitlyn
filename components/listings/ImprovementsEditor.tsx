"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { updateListingImprovements } from "@/app/(app)/listings/actions";
import type { ListingImprovement } from "@/types/database";

const inputClass = "w-full rounded-lg border border-neutral-200 px-2.5 py-1.5 text-sm";

// Optional - only some listings have a capital-improvements history, so an
// empty list hides the whole section on the public page rather than
// showing a blank block.
export function ImprovementsEditor({ listingId, improvements }: { listingId: string; improvements: ListingImprovement[] | null }) {
  const router = useRouter();
  const [items, setItems] = useState<ListingImprovement[]>(improvements ?? []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function update(i: number, patch: Partial<ListingImprovement>) {
    setItems((rows) => rows.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await updateListingImprovements(listingId, items.length > 0 ? items : null);
    setSaving(false);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">Capital improvements</h3>
        <button type="button" onClick={() => setItems((rows) => [...rows, { item: "", year: "", cost: "" }])} className="flex items-center gap-1 text-xs font-semibold text-brand-600">
          <Plus size={13} /> Add item
        </button>
      </div>
      <div className="space-y-2">
        {items.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={row.item} onChange={(e) => update(i, { item: e.target.value })} placeholder="Roof replacement" className={`${inputClass} flex-1`} />
            <input value={row.year} onChange={(e) => update(i, { year: e.target.value })} placeholder="2022" className={`${inputClass} w-20`} />
            <input value={row.cost} onChange={(e) => update(i, { cost: e.target.value })} placeholder="$11,400" className={`${inputClass} w-28`} />
            <button type="button" onClick={() => setItems((rows) => rows.filter((_, idx) => idx !== i))} className="shrink-0 text-neutral-400">
              <X size={15} />
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-neutral-400">No improvements added - the section stays hidden on the public page.</p>}
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="mt-3 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : saved ? "Saved" : "Save improvements"}
      </button>
    </div>
  );
}
