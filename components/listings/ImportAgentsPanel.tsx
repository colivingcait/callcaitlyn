"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { importListingAgentsCsv } from "@/app/(app)/listings/actions";

export function ImportAgentsPanel({ listingId, listingAddress }: { listingId: string; listingAddress: string }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pasting, setPasting] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; updated: number; skipped: number; detectedAddress: string | null } | null>(null);
  const [error, setError] = useState("");

  async function runImport(text: string) {
    setImporting(true);
    setError("");
    setResult(null);
    const outcome = await importListingAgentsCsv(listingId, text);
    setImporting(false);
    if (!outcome.ok) {
      setError(outcome.error);
      return;
    }
    setResult(outcome);
    setPasting(false);
    setPasteText("");
    router.refresh();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    await runImport(text);
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <div>
      <div className="flex flex-col items-start gap-3 rounded-2xl border-2 border-dashed border-neutral-300 bg-white p-5 sm:flex-row sm:items-center">
        <UploadCloud size={26} className="shrink-0 text-neutral-400" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-neutral-900">Drop the FMLS or GAMLS export here</p>
          <p className="mt-0.5 text-sm leading-5 text-neutral-500">
            CSV or paste rows straight from the spreadsheet. Columns are matched by name, so extra columns are ignored.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <input ref={fileInput} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={importing}
            className="rounded-[10px] border border-neutral-200 bg-white px-3.5 py-2 text-sm font-semibold text-neutral-800 disabled:opacity-50"
          >
            {importing ? "Importing…" : "Choose file"}
          </button>
          <button
            type="button"
            onClick={() => setPasting((v) => !v)}
            className="rounded-[10px] border border-neutral-200 bg-white px-3.5 py-2 text-sm font-semibold text-neutral-800"
          >
            Or paste rows
          </button>
        </div>
      </div>

      {pasting && (
        <div className="mt-3 rounded-2xl border border-neutral-200 bg-white p-4">
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={6}
            placeholder="Paste the export rows here, headers included"
            className="w-full rounded-lg border border-neutral-200 p-2.5 text-sm"
          />
          <button
            type="button"
            onClick={() => runImport(pasteText)}
            disabled={importing || !pasteText.trim()}
            className="mt-2 rounded-[10px] bg-neutral-900 px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {importing ? "Importing…" : "Import pasted rows"}
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {result && (
        <p className="mt-2 text-sm text-neutral-600">
          Imported {result.imported}, updated {result.updated}
          {result.skipped > 0 ? `, skipped ${result.skipped} unparsed row${result.skipped === 1 ? "" : "s"}` : ""}.
          {result.detectedAddress && result.detectedAddress.toLowerCase() !== listingAddress.toLowerCase()
            ? ` This export was labeled "${result.detectedAddress}" — double check it belongs on this listing.`
            : ""}
        </p>
      )}
    </div>
  );
}
