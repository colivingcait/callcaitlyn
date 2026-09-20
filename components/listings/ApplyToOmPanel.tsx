"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { applyOmSidecarToListing } from "@/app/(app)/listings/actions";
import { parseOmSidecarJson, planOmSidecarApply, type OmApplyChange, type OmApplyChangeGroup } from "@/lib/listings/om-sidecar";
import type { Listing } from "@/types/database";

const GROUP_LABEL: Record<OmApplyChangeGroup, string> = {
  bands: "Public bands",
  financials: "Gated financials",
  occupancy: "T12 occupancy",
  hints: "Listing hints",
  improvements: "Improvements",
  documents: "Documents",
};

const GROUP_ORDER: OmApplyChangeGroup[] = ["bands", "financials", "occupancy", "hints", "improvements", "documents"];

function snapshot(listing: Listing) {
  return {
    nickname: listing.nickname,
    om_number: listing.om_number,
    submarket: listing.submarket,
    total_rooms: listing.total_rooms,
    band_gross_rent: listing.band_gross_rent,
    band_expense_load: listing.band_expense_load,
    band_cash_on_cash: listing.band_cash_on_cash,
    band_cap_rate: listing.band_cap_rate,
    padsplit_url: listing.padsplit_url,
    financials: listing.financials,
    improvements: listing.improvements,
  };
}

export function ApplyToOmPanel({ listingId, listing }: { listingId: string; listing: Listing }) {
  const router = useRouter();
  const [raw, setRaw] = useState("");
  const [fileName, setFileName] = useState("");
  const [overwriteHints, setOverwriteHints] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const parsed = useMemo(() => (raw.trim() ? parseOmSidecarJson(raw) : null), [raw]);
  const plan = useMemo(() => {
    if (!parsed || !parsed.ok) return null;
    return planOmSidecarApply(parsed.sidecar, snapshot(listing), { overwriteHints });
  }, [parsed, listing, overwriteHints]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setSaved(false);
    setError("");
    setRaw(await file.text());
    e.target.value = "";
  }

  async function handleApply() {
    if (!raw.trim()) return;
    setSaving(true);
    setSaved(false);
    setError("");
    const result = await applyOmSidecarToListing({
      listingId,
      rawJson: raw,
      overwriteHints,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2000);
  }

  const groups = GROUP_ORDER.map((group) => ({
    group,
    rows: (plan?.changes ?? []).filter((row) => row.group === group),
  })).filter((g) => g.rows.length > 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-neutral-900">Apply to OM</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Upload or paste Vera&apos;s sidecar JSON. Apply fills public bands and gated financials. The xlsx is a download packet —
          upload it in the Buyer workbook slot, do not parse cells from it.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="cursor-pointer rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700">
          Upload JSON
          <input type="file" accept=".json,application/json" className="hidden" onChange={handleFile} />
        </label>
        {fileName && <span className="text-xs text-neutral-400">{fileName}</span>}
      </div>

      <textarea
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          setSaved(false);
          setError("");
        }}
        rows={7}
        className="w-full rounded-xl border border-neutral-200 p-3 font-mono text-[13px] leading-5"
        placeholder='{"schema_version": 1, "deal_key": "candace", ...}'
      />

      {parsed && !parsed.ok && <p className="text-sm text-red-600">{parsed.error}</p>}

      {plan && (
        <div className="space-y-3">
          {plan.dealKey && <p className="text-xs text-neutral-400">Deal key: {plan.dealKey}</p>}
          {groups.length === 0 ? (
            <p className="text-sm text-neutral-500">Sidecar matches the current OM fields. Nothing to apply.</p>
          ) : (
            groups.map(({ group, rows }) => (
              <div key={group}>
                <h3 className="mb-1.5 text-sm font-semibold text-neutral-900">{GROUP_LABEL[group]}</h3>
                <div className="overflow-hidden rounded-xl border border-neutral-200">
                  {rows.map((row) => (
                    <DiffRow key={row.path} row={row} />
                  ))}
                </div>
              </div>
            ))
          )}

          {plan.protectedCount > 0 && (
            <label className="flex items-start gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={overwriteHints}
                onChange={(e) => setOverwriteHints(e.target.checked)}
              />
              <span>Overwrite existing nickname / OM number / submarket / rooms. Unchecked, empty fields only are filled.</span>
            </label>
          )}

          {plan.buyerWorkbookHint && (
            <p className="text-xs text-neutral-500">
              Expected buyer workbook: <span className="font-medium text-neutral-700">{plan.buyerWorkbookHint}</span>. Upload the
              .xlsx in the Buyer workbook document slot — Apply to OM does not attach files.
            </p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleApply}
        disabled={saving || !parsed?.ok}
        className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving ? "Applying…" : saved ? "Applied" : "Apply to OM"}
      </button>
    </div>
  );
}

function DiffRow({ row }: { row: OmApplyChange }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-neutral-100 px-3 py-2 last:border-b-0 sm:grid-cols-[minmax(0,9rem)_1fr_1fr] sm:items-start sm:gap-3">
      <p className="text-xs font-medium text-neutral-600">
        {row.label}
        {row.overwriteProtected && <span className="ml-1 font-normal text-amber-700">protected</span>}
      </p>
      <p className="truncate text-xs text-neutral-400" title={row.before}>
        {row.before}
      </p>
      <p className="truncate text-xs text-neutral-800" title={row.after}>
        → {row.after}
      </p>
    </div>
  );
}
