"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { addEventRegistrant } from "@/app/(app)/events/actions";
import { searchContactsToConfirm } from "@/app/(app)/dialer/actions";
import type { EventEntry } from "@/lib/data/events";
import type { ConfirmationSearchResult } from "@/lib/data/dialer";

export function AddRegistrantButton({ event }: { event: EventEntry }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ConfirmationSearchResult[]>([]);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function search(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    setResults(await searchContactsToConfirm(value));
  }

  async function add(contactId: string) {
    setAdding(contactId);
    setError("");
    const result = await addEventRegistrant({
      contactId,
      series: event.series,
      eventId: event.eventId,
      eventName: event.label,
      eventStart: event.startsAt ?? event.date,
    });
    setAdding(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setQuery("");
    setResults([]);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#c45c4a]"
      >
        <Plus size={15} /> Add registrant
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display text-[20px] font-semibold text-neutral-900">Add registrant</p>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100">
                <X size={18} />
              </button>
            </div>
            <input
              value={query}
              onChange={(e) => void search(e.target.value)}
              placeholder="Search contacts..."
              className="h-11 w-full rounded-xl border border-[#eadfd6] px-3 text-[14px] outline-none focus:border-[#c45c4a]/40"
            />
            {error && <p className="mt-2 text-[13px] text-red-600">{error}</p>}
            <div className="mt-3 space-y-1">
              {results.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  disabled={adding === person.id}
                  onClick={() => void add(person.id)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-[#fff7f2]"
                >
                  <span className="text-[15px] font-medium text-neutral-900">{person.name}</span>
                  <span className="text-[13px] text-[#c45c4a]">{adding === person.id ? "Adding…" : "Add"}</span>
                </button>
              ))}
              {query.trim().length >= 2 && results.length === 0 && <p className="px-1 py-3 text-[13px] text-neutral-400">No matching contacts.</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
