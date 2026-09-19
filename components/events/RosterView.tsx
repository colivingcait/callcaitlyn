"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, MessageCircle, Search, Trash2, Users } from "lucide-react";
import { openQuoCall, openQuoText } from "@/lib/quo/call-link";
import { formatPhone, initials, cn } from "@/lib/utils";
import { formatLocal } from "@/lib/format-time";
import { daysOutLabel } from "@/lib/crm/today-v1";
import { eventPlaceLabel, registrantIdsForMessage, rosterStatusLabel } from "@/lib/crm/events-sot";
import { markContactAttended, unmarkAttended, deleteEventByEventId, deleteEventByKey } from "@/app/(app)/events/actions";
import { AddRegistrantButton } from "@/components/events/AddRegistrantButton";
import { MessageRegistrantsModal } from "@/components/events/MessageRegistrantsModal";
import { RosterTextAndNext } from "@/components/events/RosterTextAndNext";
import type { EventEntry, RosterPerson } from "@/lib/data/events";

type StatusFilter = "all" | "registered" | "attended" | "no_show";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "registered", label: "Registered" },
  { value: "attended", label: "Checked in" },
  { value: "no_show", label: "No-show" },
];

function matchesFilter(p: RosterPerson, filter: StatusFilter, hasEnded: boolean): boolean {
  if (filter === "all") return true;
  if (filter === "registered") return p.registered && !p.attended;
  if (filter === "attended") return p.attended;
  return p.registered && !p.attended && hasEnded;
}

function statusChipClass(status: string) {
  if (status === "Checked in") return "bg-[#e8f5e9] text-[#2e7d32]";
  if (status === "No-show") return "bg-neutral-100 text-neutral-500";
  return "bg-[#f8efe4] text-[#c45c4a]";
}

export function RosterView({
  event,
  lastActivityLabels,
  startTextNext = false,
}: {
  event: EventEntry;
  lastActivityLabels: Record<string, string>;
  startTextNext?: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [markedAttended, setMarkedAttended] = useState<Set<string>>(new Set());
  const [markedNoShow, setMarkedNoShow] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [marking, setMarking] = useState<string | null>(null);
  const [messageOpen, setMessageOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const people = event.people.map((p) => {
    if (markedAttended.has(p.contactId)) return { ...p, attended: true };
    if (markedNoShow.has(p.contactId)) return { ...p, attended: false };
    return p;
  });
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter((p) => matchesFilter(p, filter, event.hasEnded) && (!q || p.name.toLowerCase().includes(q) || (p.phone ?? "").includes(q)));
  }, [people, filter, event.hasEnded, query]);

  const counts: Record<StatusFilter, number> = {
    all: people.length,
    registered: people.filter((p) => p.registered && !p.attended).length,
    attended: people.filter((p) => p.attended).length,
    no_show: event.hasEnded ? people.filter((p) => p.registered && !p.attended).length : 0,
  };

  async function markAttended(contactId: string) {
    setMarking(contactId);
    setMarkedAttended((prev) => new Set(prev).add(contactId));
    setMarkedNoShow((prev) => {
      const next = new Set(prev);
      next.delete(contactId);
      return next;
    });
    await markContactAttended(contactId, event.series, event.eventId);
    setMarking(null);
    router.refresh();
  }

  async function markNoShow(contactId: string) {
    setMarking(contactId);
    setMarkedNoShow((prev) => new Set(prev).add(contactId));
    setMarkedAttended((prev) => {
      const next = new Set(prev);
      next.delete(contactId);
      return next;
    });
    await unmarkAttended(contactId, event.eventId);
    setMarking(null);
    router.refresh();
  }

  async function bulk(action: "attended" | "no_show") {
    const ids = [...selected];
    if (ids.length === 0) return;
    for (const id of ids) {
      if (action === "attended") await markAttended(id);
      else await markNoShow(id);
    }
    setSelected(new Set());
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError("");
    const result = event.eventId ? await deleteEventByEventId(event.eventId) : await deleteEventByKey(event.key);
    if (result.ok) {
      router.refresh();
    } else {
      setDeleting(false);
      setDeleteError(result.error);
    }
  }

  const when = event.startsAt ?? event.date;
  const messageIds = registrantIdsForMessage(people);
  const statusOptions = event.hasEnded ? STATUS_OPTIONS : STATUS_OPTIONS.filter((opt) => opt.value !== "no_show");

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[13px] text-neutral-400">
            <Link href="/events" className="hover:text-neutral-600">
              Events
            </Link>
            <span> › {event.label}</span>
          </p>
          <h1 className="mt-2 flex items-center gap-2.5 font-display text-[32px] font-semibold tracking-[-0.03em] text-neutral-900">
            <Users size={28} className="text-[#c45c4a]" />
            Roster · {event.counts.registered} registered
          </h1>
          <p className="mt-1 text-[15px] text-neutral-500">
            {formatLocal(when, "MMMM d")} · {eventPlaceLabel(event.location, event.seriesLabel)}
            {event.startsAt ? ` · ${formatLocal(event.startsAt, "h:mm a")}` : ""} · {daysOutLabel(when)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button type="button" onClick={() => setMessageOpen(true)} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#c45c4a]">
          <MessageCircle size={15} /> Message all
        </button>
        <a href={`/api/events/export?event=${encodeURIComponent(event.key)}`} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#c45c4a]">
          <Download size={15} /> Export
        </a>
        <AddRegistrantButton event={event} />
      </div>

      {startTextNext && (
        <div className="mt-5">
          <RosterTextAndNext event={{ ...event, people }} />
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search attendees..."
            className="h-11 w-full rounded-full border border-[#eadfd6] bg-white pl-9 pr-4 text-[14px] outline-none focus:border-[#c45c4a]/40"
          />
        </label>
        <div className="inline-flex rounded-full bg-[#f3e4dc]/60 p-1">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilter((current) => (current === opt.value ? "all" : opt.value))}
              className={cn(
                "rounded-full px-3 py-1.5 text-[13px] font-medium",
                filter === opt.value ? "bg-[#c45c4a] text-white" : "text-neutral-600",
              )}
            >
              {opt.label}
              <span className="ml-1 text-[12px] opacity-80">{counts[opt.value]}</span>
            </button>
          ))}
        </div>
      </div>

      {event.hasEnded && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={selected.size === 0 || marking !== null}
            onClick={() => void bulk("attended")}
            className="rounded-xl border border-[#eadfd6] bg-white px-3 py-1.5 text-[13px] font-semibold text-neutral-800 disabled:opacity-40"
          >
            Mark attended{selected.size > 0 ? ` · ${selected.size}` : ""}
          </button>
          <button
            type="button"
            disabled={selected.size === 0 || marking !== null}
            onClick={() => void bulk("no_show")}
            className="rounded-xl border border-[#eadfd6] bg-white px-3 py-1.5 text-[13px] font-semibold text-neutral-800 disabled:opacity-40"
          >
            Mark no-show{selected.size > 0 ? ` · ${selected.size}` : ""}
          </button>
        </div>
      )}

      <div className="mt-4 hidden overflow-hidden rounded-[16px] border border-[#eadfd6] bg-white lg:block">
        <div className="grid grid-cols-[auto_minmax(0,1.6fr)_1fr_1fr_1fr_1fr_auto_auto] items-center gap-3 border-b border-[#eadfd6] px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[.06em] text-neutral-400">
          <span className="w-8">{event.hasEnded ? "" : ""}</span>
          <span>Name</span>
          <span>Phone</span>
          <span>Source</span>
          <span>Status</span>
          <span>Last touch</span>
          <span className="text-right">Text</span>
          <span className="text-right">Call</span>
        </div>
        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-[14px] text-neutral-400">No one matches this filter.</p>
        ) : (
          filtered.map((p) => {
            const status = rosterStatusLabel(p, event.hasEnded);
            return (
              <div
                key={p.contactId}
                className="grid grid-cols-[auto_minmax(0,1.6fr)_1fr_1fr_1fr_1fr_auto_auto] items-center gap-3 border-b border-neutral-100 px-4 py-3 last:border-b-0"
              >
                <div className="w-8">
                  {event.hasEnded && (
                    <input
                      type="checkbox"
                      checked={selected.has(p.contactId)}
                      onChange={() =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(p.contactId)) next.delete(p.contactId);
                          else next.add(p.contactId);
                          return next;
                        })
                      }
                      className="h-4 w-4 rounded border-neutral-300"
                    />
                  )}
                </div>
                <Link href={`/contacts/${p.contactId}`} className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f3e4dc] text-[12px] font-semibold text-[#c45c4a]">
                    {initials(p.firstName, p.lastName)}
                  </span>
                  <span className="truncate text-[15px] font-semibold text-neutral-900">{p.name || "Unnamed"}</span>
                </Link>
                <span className="truncate text-[13px] text-neutral-600">{p.phone ? formatPhone(p.phone) : "—"}</span>
                <span className="truncate text-[13px] text-neutral-600">{p.source ?? "—"}</span>
                <span>
                  <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-medium", statusChipClass(status))}>{status}</span>
                </span>
                <span className="truncate text-[13px] text-neutral-500">{lastActivityLabels[p.contactId] ?? "—"}</span>
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={!p.phone}
                    onClick={() => p.phone && openQuoText(p.phone)}
                    className="rounded-xl border border-[#eadfd6] bg-white px-3 py-1.5 text-[12px] font-semibold text-neutral-800 disabled:opacity-40"
                  >
                    Text
                  </button>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={!p.phone}
                    onClick={() => p.phone && openQuoCall(p.phone)}
                    className="rounded-xl bg-[#c45c4a] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40"
                  >
                    Call
                  </button>
                </div>
                {event.hasEnded && (
                  <div className="col-span-8 -mt-1 mb-1 flex justify-end gap-2">
                    {!p.attended ? (
                      <button
                        type="button"
                        disabled={marking === p.contactId}
                        onClick={() => void markAttended(p.contactId)}
                        className="text-[12px] font-semibold text-[#c45c4a] disabled:opacity-50"
                      >
                        Mark attended
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={marking === p.contactId}
                        onClick={() => void markNoShow(p.contactId)}
                        className="text-[12px] font-semibold text-neutral-500 disabled:opacity-50"
                      >
                        Mark no-show
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 space-y-2 lg:hidden">
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-[#eadfd6] bg-white px-4 py-6 text-center text-[15px] text-neutral-400">No one matches this filter.</p>
        ) : (
          filtered.map((p) => {
            const status = rosterStatusLabel(p, event.hasEnded);
            return (
              <div key={p.contactId} className="rounded-2xl border border-[#eadfd6] bg-white px-4 py-3">
                <div className="flex items-start gap-3">
                  {event.hasEnded && (
                    <input
                      type="checkbox"
                      checked={selected.has(p.contactId)}
                      onChange={() =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(p.contactId)) next.delete(p.contactId);
                          else next.add(p.contactId);
                          return next;
                        })
                      }
                      className="mt-1 h-4 w-4 rounded border-neutral-300"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] font-semibold text-neutral-900">{p.name || "Unnamed"}</p>
                    <p className="mt-0.5 text-[13px] text-neutral-500">{p.phone ? formatPhone(p.phone) : "No phone"} · {p.source ?? "—"}</p>
                    <p className="mt-1">
                      <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-medium", statusChipClass(status))}>{status}</span>
                      <span className="ml-2 text-[12px] text-neutral-400">{lastActivityLabels[p.contactId] ?? ""}</span>
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {event.hasEnded && !p.attended && (
                    <button type="button" onClick={() => void markAttended(p.contactId)} className="rounded-xl border border-[#eadfd6] px-3 py-1.5 text-[13px] font-semibold">
                      Mark attended
                    </button>
                  )}
                  {event.hasEnded && p.attended && (
                    <button type="button" onClick={() => void markNoShow(p.contactId)} className="rounded-xl border border-[#eadfd6] px-3 py-1.5 text-[13px] font-semibold">
                      Mark no-show
                    </button>
                  )}
                  <button type="button" disabled={!p.phone} onClick={() => p.phone && openQuoText(p.phone)} className="rounded-xl border border-[#eadfd6] px-3 py-1.5 text-[13px] font-semibold disabled:opacity-40">
                    Text
                  </button>
                  <button type="button" disabled={!p.phone} onClick={() => p.phone && openQuoCall(p.phone)} className="rounded-xl bg-[#c45c4a] px-3 py-1.5 text-[13px] font-semibold text-white disabled:opacity-40">
                    Call
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-neutral-400">
          {event.hasEnded
            ? "Registered but not checked in counts as a no-show until you mark them attended."
            : "No-shows are counted after this event ends."}
        </p>
        {confirmingDelete ? (
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={handleDelete} disabled={deleting} className="rounded-[10px] bg-red-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
              {deleting ? "Deleting…" : "Confirm delete"}
            </button>
            <button type="button" onClick={() => setConfirmingDelete(false)} className="rounded-[10px] border border-neutral-200 bg-white px-3 py-1.5 text-sm font-semibold">
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmingDelete(true)} className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-red-600">
            <Trash2 size={14} /> Remove entirely
          </button>
        )}
      </div>
      {deleteError && <p className="mt-1 text-right text-sm text-red-600">{deleteError}</p>}

      {messageOpen && (
        <MessageRegistrantsModal eventKey={event.key} eventLabel={event.label} contactIds={messageIds} onClose={() => setMessageOpen(false)} />
      )}
    </div>
  );
}
