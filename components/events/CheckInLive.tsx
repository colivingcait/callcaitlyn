"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, UserPlus, Check } from "lucide-react";
import { markContactAttended, unmarkAttended } from "@/app/(app)/events/actions";
import { searchContactsToConfirm } from "@/app/(app)/dialer/actions";
import type { EventEntry } from "@/lib/data/events";
import type { ConfirmationSearchResult } from "@/lib/data/dialer";

// Mobile-only "standing at the door" view for an event that hasn't ended
// yet - one running counter, tap a waiting name to check them in, hold a
// checked-in one to undo a mis-tap, and a search box for a genuine walk-in
// who isn't even on the registration list.
export function CheckInLive({ event }: { event: EventEntry }) {
  const router = useRouter();
  const [justChecked, setJustChecked] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ConfirmationSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const people = event.people.map((p) => (justChecked.has(p.contactId) ? { ...p, attended: true } : p));
  const attendedCount = people.filter((p) => p.attended).length;
  const waiting = [...people].filter((p) => !p.attended).sort((a, b) => a.name.localeCompare(b.name));
  const checkedIn = [...people].filter((p) => p.attended).sort((a, b) => a.name.localeCompare(b.name));

  async function checkIn(contactId: string) {
    setPending(contactId);
    setJustChecked((prev) => new Set(prev).add(contactId));
    await markContactAttended(contactId, event.series, event.eventId);
    setPending(null);
    router.refresh();
  }

  async function undo(contactId: string) {
    setJustChecked((prev) => {
      const next = new Set(prev);
      next.delete(contactId);
      return next;
    });
    await unmarkAttended(contactId, event.eventId);
    router.refresh();
  }

  function startHold(contactId: string) {
    holdTimer.current = setTimeout(() => undo(contactId), 600);
  }
  function cancelHold() {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  }

  async function runSearch(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    setResults(await searchContactsToConfirm(value));
    setSearching(false);
  }

  async function addWalkIn(contactId: string) {
    setQuery("");
    setResults([]);
    await checkIn(contactId);
  }

  return (
    <div>
      <div className="rounded-2xl bg-neutral-900 px-5 py-4 text-center text-white">
        <p className="text-3xl font-semibold">
          {attendedCount} <span className="text-lg font-normal text-neutral-400">of {people.length || attendedCount}</span>
        </p>
        <p className="text-sm text-neutral-400">checked in</p>
      </div>

      <div className="relative mt-3">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          value={query}
          onChange={(e) => runSearch(e.target.value)}
          placeholder="Search the list, or add a walk-in"
          className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-9 pr-3 text-[15px]"
        />
        {results.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => addWalkIn(r.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50"
              >
                <UserPlus size={14} className="text-neutral-400" /> {r.name}
              </button>
            ))}
          </div>
        )}
      </div>
      {query.trim().length >= 2 && !searching && results.length === 0 && (
        <p className="mt-1 text-xs text-neutral-400">No match — add them in Contacts first if they&apos;re not already one.</p>
      )}

      <p className="mt-4 mb-1.5 text-[13px] font-semibold uppercase tracking-[.05em] text-neutral-400">Waiting · {waiting.length}</p>
      <div className="space-y-1.5">
        {waiting.length === 0 ? (
          <p className="text-[15px] text-neutral-400">Everyone registered is checked in.</p>
        ) : (
          waiting.map((p) => (
            <button
              key={p.contactId}
              type="button"
              onClick={() => checkIn(p.contactId)}
              disabled={pending === p.contactId}
              className="flex w-full items-center justify-between rounded-xl border border-[#ebe9e7] bg-white px-4 py-3 text-left disabled:opacity-50"
            >
              <span className="text-base font-medium text-neutral-900">{p.name || "Unnamed"}</span>
              <span className="text-sm font-semibold text-brand-700">{pending === p.contactId ? "…" : "Check in"}</span>
            </button>
          ))
        )}
      </div>

      {checkedIn.length > 0 && (
        <>
          <p className="mt-4 mb-1.5 text-[13px] font-semibold uppercase tracking-[.05em] text-neutral-400">
            Checked in · {checkedIn.length} · hold to undo
          </p>
          <div className="space-y-1.5">
            {checkedIn.map((p) => (
              <div
                key={p.contactId}
                onPointerDown={() => startHold(p.contactId)}
                onPointerUp={cancelHold}
                onPointerLeave={cancelHold}
                className="flex select-none items-center justify-between rounded-xl border border-[#ebe9e7] bg-[#fdf3f2] px-4 py-3"
              >
                <span className="text-base font-medium text-neutral-900">{p.name || "Unnamed"}</span>
                <Check size={16} className="text-brand-700" />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
