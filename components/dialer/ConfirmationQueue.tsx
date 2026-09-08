"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Plus, Search, X } from "lucide-react";
import { DialerCallModal } from "@/components/dialer/DialerCallModal";
import { addToConfirmationList, searchContactsToConfirm } from "@/app/(app)/dialer/actions";
import { confirmationItemToDialerContact } from "@/lib/crm/dialer-mapping";
import { formatPhone, initials } from "@/lib/utils";
import type { ConfirmationQueueItem, ConfirmationSearchResult, UpcomingConfirmationEvent } from "@/lib/data/dialer";
import type { PipelineStage, TextTemplate } from "@/types/database";

function formatEventStart(eventStart: string): string {
  return new Date(eventStart).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function ConfirmationQueue({
  items,
  events,
  stages,
  defaultDraftTemplate,
}: {
  items: ConfirmationQueueItem[];
  events: UpcomingConfirmationEvent[];
  stages: PipelineStage[];
  defaultDraftTemplate?: TextTemplate | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<ConfirmationQueueItem | null>(null);
  const [adding, setAdding] = useState(false);

  if (events.length === 0) {
    return <p className="px-4 py-10 text-center text-sm text-neutral-400">Nothing happening in the next couple days to confirm.</p>;
  }

  return (
    <div className="space-y-2 px-4 pb-24">
      {!adding ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-neutral-300 bg-white py-3 text-sm font-semibold text-neutral-600 hover:border-brand-300 hover:text-brand-700"
        >
          <Plus size={15} /> Add someone who hasn&apos;t registered
        </button>
      ) : (
        <AddSomeoneCard
          events={events}
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      )}

      {items.length === 0 && (
        <p className="px-1 py-6 text-center text-sm text-neutral-400">Everyone for {events.length === 1 ? events[0].eventName : "these events"} is confirmed.</p>
      )}

      {items.map((item) => (
        <button
          key={`${item.eventId}:${item.id}`}
          onClick={() => setSelected(item)}
          className="flex w-full items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3.5 text-left shadow-card"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
            {initials(item.first_name, item.last_name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-neutral-900">
              {item.first_name} {item.last_name}
            </p>
            <p className="truncate text-xs text-neutral-500">{formatPhone(item.phone)}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-neutral-400">
              <span className="truncate">{item.eventName}</span>
              <span>· {formatEventStart(item.eventStart)}</span>
              {item.source === "manual" && <span className="text-brand-600">· added by you</span>}
              {item.confirmationSnoozedAt && (
                <span className="flex items-center gap-0.5 text-amber-600">
                  <Clock size={10} /> Tried
                </span>
              )}
            </div>
          </div>
        </button>
      ))}

      {selected && (
        <DialerCallModal
          contact={confirmationItemToDialerContact(selected)}
          stages={stages}
          mode="confirmation"
          defaultDraftTemplate={defaultDraftTemplate}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function AddSomeoneCard({
  events,
  onClose,
  onAdded,
}: {
  events: UpcomingConfirmationEvent[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [eventId, setEventId] = useState(events[0].eventId);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ConfirmationSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function search(q: string) {
    setQuery(q);
    setError(null);
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }
    setSearching(true);
    const found = await searchContactsToConfirm(q);
    setSearching(false);
    setResults(found);
  }

  async function add(contactId: string) {
    const event = events.find((e) => e.eventId === eventId);
    if (!event) return;
    setAddingId(contactId);
    setError(null);
    const result = await addToConfirmationList(contactId, event.eventId, event.eventName);
    setAddingId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onAdded();
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-3.5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-neutral-800">Add someone to confirm</p>
        <button onClick={onClose} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100">
          <X size={16} />
        </button>
      </div>

      {events.length > 1 && (
        <select
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="mt-2 w-full rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs"
        >
          {events.map((e) => (
            <option key={e.eventId} value={e.eventId}>
              {e.eventName} · {formatEventStart(e.eventStart)}
            </option>
          ))}
        </select>
      )}

      <div className="relative mt-2">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          autoFocus
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="Search by name"
          className="w-full rounded-lg border border-neutral-200 py-2 pl-8 pr-3 text-sm outline-none focus:border-brand-400"
        />
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {query.trim().length >= 2 && (
        <div className="mt-2 max-h-48 space-y-0.5 overflow-y-auto">
          {searching && <p className="px-1 py-2 text-xs text-neutral-400">Searching…</p>}
          {!searching && results?.length === 0 && <p className="px-1 py-2 text-xs text-neutral-400">No matching contacts.</p>}
          {results?.map((r) => (
            <button
              key={r.id}
              onClick={() => add(r.id)}
              disabled={addingId === r.id}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-neutral-50 disabled:opacity-50"
            >
              <span>
                <span className="font-medium text-neutral-800">{r.name}</span>
                {r.phone && <span className="ml-2 text-xs text-neutral-400">{formatPhone(r.phone)}</span>}
              </span>
              {addingId === r.id && <span className="text-xs text-neutral-400">Adding…</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
