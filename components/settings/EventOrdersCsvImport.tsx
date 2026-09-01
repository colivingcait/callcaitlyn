"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui";
import { importEventbriteOrdersCsv } from "@/app/(app)/events/actions";
import type { EventSeries } from "@/lib/data/events";

type ImportResult = Awaited<ReturnType<typeof importEventbriteOrdersCsv>>;

// Eventbrite's live webhook has at least one confirmed gap (a whole
// 52-registration event that never made it into activities) and its API
// has never once returned a real event start time - so this export
// (Reports > Orders, or a "CrossEvent Orders" export covering several
// events) is the actual source of truth, not a fallback. Which account the
// file came from isn't in the CSV itself, so it's asked here rather than
// guessed from event titles - guessing by title is exactly how the House
// Hacking/Women's REI mislabeling happened in the first place.
export function EventOrdersCsvImport() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [text, setText] = useState("");
  const [account, setAccount] = useState<EventSeries>("womens_rei");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setText(await file.text());
    setResult(null);
  }

  async function handleImport() {
    if (!text) return;
    setRunning(true);
    setResult(null);
    const outcome = await importEventbriteOrdersCsv(text, account);
    setRunning(false);
    setResult(outcome);
    if (outcome.ok) router.refresh();
  }

  return (
    <div className="border-b border-neutral-100 pb-3.5 last:border-b-0 last:pb-0">
      <p className="text-[15px] leading-[22px] text-neutral-600">
        Import an Eventbrite orders CSV (Reports → Orders, or a multi-event export). Fills in any missing
        registrations, fixes wrong event dates, and corrects which account an event belongs to - all from
        Eventbrite&apos;s own record, not a guess.
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-[10px] border border-neutral-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-neutral-800"
        >
          {fileName || "Choose CSV file"}
        </button>
        <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
        <Select value={account} onChange={(e) => setAccount(e.target.value as EventSeries)} className="w-auto">
          <option value="womens_rei">Women&apos;s REI account</option>
          <option value="house_hacking">House Hacking Atlanta account</option>
        </Select>
        <button
          type="button"
          onClick={handleImport}
          disabled={!text || running}
          className="rounded-[10px] bg-neutral-900 px-3.5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {running ? "Importing…" : "Import"}
        </button>
      </div>
      {result && (
        <div className="mt-2 text-xs text-neutral-500">
          {result.ok ? (
            <p>
              {result.events} event{result.events === 1 ? "" : "s"} in the file · {result.inserted} registration
              {result.inserted === 1 ? "" : "s"} added · {result.alreadyTracked} already on file · {result.created} new
              contact{result.created === 1 ? "" : "s"} · {result.matched} matched existing
              {result.correctedExisting > 0 ? ` · ${result.correctedExisting} corrected` : ""}
              {result.relinkedWalkIns > 0 ? ` · ${result.relinkedWalkIns} walk-in${result.relinkedWalkIns === 1 ? "" : "s"} relinked` : ""}
              {result.skipped > 0 ? ` · ${result.skipped} row${result.skipped === 1 ? "" : "s"} skipped` : ""}
              {result.failed > 0 ? ` · ${result.failed} couldn't be matched` : ""}
            </p>
          ) : (
            <p className="text-red-600">{result.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
