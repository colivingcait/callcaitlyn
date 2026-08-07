"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Textarea } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { X, AlertTriangle } from "lucide-react";
import { parseBulkDeals, type ParsedDealRow } from "@/lib/crm/bulk-import-deals";

const TEMPLATE =
  "Address\tClosing Date\tSale Price\tGross Comp\tSide\tReferral Fees\tKW\tKWRI\tOZ\tFMLS\tTC\tMisc\tNotes";

export function BulkImportModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [text, setText] = useState("");
  // Defaults on since backfilling past deals with their real, already-
  // known fee amounts is the primary reason to bulk-import in the first
  // place - flip it off to have KW/KWRI/FMLS/TC calculated instead.
  const [manualSplit, setManualSplit] = useState(true);
  const [parsed, setParsed] = useState<{ rows: ParsedDealRow[]; unmatchedHeaders: string[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleParse() {
    setError("");
    setParsed(parseBulkDeals(text));
  }

  const validRows = parsed?.rows.filter((r) => r.errors.length === 0) ?? [];
  const invalidRows = parsed?.rows.filter((r) => r.errors.length > 0) ?? [];

  async function handleImport() {
    if (validRows.length === 0) return;
    setSaving(true);
    setError("");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Your session expired. Please sign in again.");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("deals").insert(
      validRows.map((r) => ({
        owner_id: user.id,
        contact_id: null,
        client_name: r.clientName,
        status: "won",
        closed_at: r.closedAt,
        address: r.address,
        side: r.side,
        sale_price: r.salePrice,
        gross_commission: r.grossCommission,
        misc_fee: r.miscFee,
        oz_fee: r.ozFee,
        manual_split: manualSplit,
        ...(manualSplit
          ? { kw_fee: r.kwFee, kwri_fee: r.kwriFee, fmls_fee: r.fmlsFee, tc_fee: r.tcFee, referral_fee: r.referralFee }
          : { referral_pct: r.referralPct, on_fmls: r.onFmls }),
        notes: r.notes,
      })),
    );

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between">
          <p className="font-serif text-xl font-semibold text-neutral-900">Bulk import deals</p>
          <button onClick={onClose} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>
        <p className="mt-0.5 text-sm text-neutral-500">
          Copy rows straight from a spreadsheet — you can paste your entire existing tracker as-is, extra columns
          just get ignored. First row must be headers.
        </p>

        {!parsed && (
          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-2 text-sm text-neutral-600">
              <input
                type="checkbox"
                checked={manualSplit}
                onChange={(e) => setManualSplit(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300"
              />
              Use my exact KW / KWRI / FMLS / TC / Referral amounts instead of recalculating them
            </label>
            <Textarea
              rows={10}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={TEMPLATE}
              className="font-mono text-xs"
            />
            <p className="text-xs text-neutral-400">
              Recognized headers: Address (or Client Name), Closing Date, Sale Price, Gross Comp, Side, Misc, OZ,
              Notes, plus{" "}
              {manualSplit
                ? "KW, KWRI, TC, FMLS, and Referral Fees (all as dollar amounts, used exactly as entered)"
                : "Referral % and FMLS (Yes/No or a $ amount — zero/No means that deal isn't on FMLS)"}
              . Address or Client Name and Closing Date are required per row.
            </p>
            <Button onClick={handleParse} disabled={!text.trim()}>
              Preview
            </Button>
          </div>
        )}

        {parsed && (
          <div className="mt-4 space-y-3">
            {parsed.unmatchedHeaders.length > 0 && (
              <p className="rounded-xl bg-amber-50 p-2.5 text-xs text-amber-700">
                Ignored columns (not recognized): {parsed.unmatchedHeaders.join(", ")}
              </p>
            )}

            {invalidRows.length > 0 && (
              <div className="space-y-1 rounded-xl bg-red-50 p-2.5 text-xs text-red-700">
                <p className="flex items-center gap-1.5 font-medium">
                  <AlertTriangle size={13} /> {invalidRows.length} row(s) will be skipped
                </p>
                {invalidRows.map((r) => (
                  <p key={r.line}>
                    Row {r.line} ({r.address || r.clientName || "unlabeled"}): {r.errors.join("; ")}
                  </p>
                ))}
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-neutral-200">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-100 text-neutral-400">
                    <th className="px-2 py-1.5 font-medium">Client / Address</th>
                    <th className="px-2 py-1.5 font-medium">Closed</th>
                    <th className="px-2 py-1.5 font-medium">Sale Price</th>
                    <th className="px-2 py-1.5 font-medium">Gross Comp</th>
                    <th className="px-2 py-1.5 font-medium">Side</th>
                    {manualSplit ? (
                      <>
                        <th className="px-2 py-1.5 font-medium">KW</th>
                        <th className="px-2 py-1.5 font-medium">KWRI</th>
                        <th className="px-2 py-1.5 font-medium">FMLS</th>
                        <th className="px-2 py-1.5 font-medium">TC</th>
                      </>
                    ) : (
                      <th className="px-2 py-1.5 font-medium">On FMLS</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {validRows.map((r) => (
                    <tr key={r.line} className="border-b border-neutral-50 last:border-0">
                      <td className="px-2 py-1.5">{r.address || r.clientName}</td>
                      <td className="whitespace-nowrap px-2 py-1.5">{r.closedAt?.slice(0, 10)}</td>
                      <td className="whitespace-nowrap px-2 py-1.5">{formatCurrency(r.salePrice)}</td>
                      <td className="whitespace-nowrap px-2 py-1.5">{formatCurrency(r.grossCommission)}</td>
                      <td className="px-2 py-1.5 capitalize">{r.side ?? "—"}</td>
                      {manualSplit ? (
                        <>
                          <td className="whitespace-nowrap px-2 py-1.5">{formatCurrency(r.kwFee)}</td>
                          <td className="whitespace-nowrap px-2 py-1.5">{formatCurrency(r.kwriFee)}</td>
                          <td className="whitespace-nowrap px-2 py-1.5">{formatCurrency(r.fmlsFee)}</td>
                          <td className="whitespace-nowrap px-2 py-1.5">{formatCurrency(r.tcFee)}</td>
                        </>
                      ) : (
                        <td className="px-2 py-1.5">{r.onFmls ? "Yes" : "No"}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-neutral-400">
              Double-check these against your source before importing.{" "}
              {manualSplit
                ? "KW/KWRI/FMLS/TC will be saved exactly as shown above — they still count toward this commission year's KW/KWRI caps for deals that come after."
                : "KW, KWRI, and FMLS fees will be calculated fresh from sale price and gross commission once saved, not copied from your original sheet."}
            </p>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3">
              <Button onClick={handleImport} disabled={saving || validRows.length === 0} className="flex-1">
                {saving ? "Importing…" : `Import ${validRows.length} deal${validRows.length === 1 ? "" : "s"}`}
              </Button>
              <Button variant="secondary" onClick={() => setParsed(null)} disabled={saving}>
                Back
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
