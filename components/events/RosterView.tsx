"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, ListTodo, MessageCircle, Search, Sprout, Trash2, Users } from "lucide-react";
import { openQuoCall, openQuoText } from "@/lib/quo/call-link";
import { formatPhone, initials, cn } from "@/lib/utils";
import { formatLocal } from "@/lib/format-time";
import { daysOutLabel } from "@/lib/crm/today-v1";
import {
  defaultRosterFilter,
  eventPlaceLabel,
  followUpAudienceFromFilter,
  matchesRosterFilter,
  registrantIdsForMessage,
  rosterFilterCounts,
  rosterStatusLabel,
  type RosterStatusFilter,
} from "@/lib/crm/events-sot";
import { shouldOfferFollowUp, type EventFollowUpAudience } from "@/lib/crm/event-followup";
import { markContactAttended, unmarkAttended, deleteEventByEventId, deleteEventByKey } from "@/app/(app)/events/actions";
import { AddRegistrantButton } from "@/components/events/AddRegistrantButton";
import { MessageRegistrantsModal } from "@/components/events/MessageRegistrantsModal";
import { RosterTextAndNext } from "@/components/events/RosterTextAndNext";
import { FollowUpTaskDrawer } from "@/components/events/FollowUpTaskDrawer";
import type { EventEntry } from "@/lib/data/events";
import type { OpenEventFollowUp } from "@/lib/data/event-followup";

const FILTER_CHIPS: { value: RosterStatusFilter; label: string; pastOnly?: boolean }[] = [
  { value: "all", label: "All" },
  { value: "checked_in", label: "Checked in" },
  { value: "no_show", label: "No-show", pastOnly: true },
  { value: "registered", label: "Registered only" },
  { value: "first_timers", label: "First-timers" },
];

function statusChipClass(status: string) {
  if (status === "Checked in") return "bg-[#e8f5e9] text-[#2e7d32]";
  if (status === "No-show") return "bg-neutral-100 text-neutral-500";
  return "bg-[#f8efe4] text-[#c45c4a]";
}

function offerStorageKey(eventKey: string) {
  return `cc-followup-offer:${eventKey}`;
}

export function RosterView({
  event,
  lastActivityLabels,
  startTextNext = false,
  startFollowUp = false,
  textNextAudience = null,
  existingFollowUp = null,
}: {
  event: EventEntry;
  lastActivityLabels: Record<string, string>;
  startTextNext?: boolean;
  startFollowUp?: boolean;
  textNextAudience?: EventFollowUpAudience | null;
  existingFollowUp?: OpenEventFollowUp | null;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<RosterStatusFilter>(defaultRosterFilter(event.hasEnded));
  const [query, setQuery] = useState("");
  const [markedAttended, setMarkedAttended] = useState<Set<string>>(new Set());
  const [markedNoShow, setMarkedNoShow] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectionTouched, setSelectionTouched] = useState(false);
  const [marking, setMarking] = useState<string | null>(null);
  const [messageOpen, setMessageOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(startFollowUp && event.hasEnded);
  const [walkOpen, setWalkOpen] = useState(startTextNext);
  const [walkAudience, setWalkAudience] = useState<EventFollowUpAudience | null>(textNextAudience);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [offerDismissed, setOfferDismissed] = useState(false);

  useEffect(() => {
    try {
      setOfferDismissed(window.localStorage.getItem(offerStorageKey(event.key)) === "1");
    } catch {
      setOfferDismissed(false);
    }
  }, [event.key]);

  const people = event.people.map((p) => {
    if (markedAttended.has(p.contactId)) return { ...p, attended: true };
    if (markedNoShow.has(p.contactId)) return { ...p, attended: false };
    return p;
  });
  const counts = rosterFilterCounts(people, event.hasEnded);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter(
      (p) => matchesRosterFilter(p, filter, event.hasEnded) && (!q || p.name.toLowerCase().includes(q) || (p.phone ?? "").includes(q) || (p.email ?? "").toLowerCase().includes(q)),
    );
  }, [people, filter, event.hasEnded, query]);

  useEffect(() => {
    if (selectionTouched) return;
    setSelected(new Set(people.filter((p) => matchesRosterFilter(p, filter, event.hasEnded)).map((p) => p.contactId)));
  }, [people, filter, event.hasEnded, selectionTouched]);

  const peopleByAudience = useMemo(() => {
    const next = {} as Record<EventFollowUpAudience, string[]>;
    for (const value of FILTER_CHIPS.map((chip) => chip.value)) {
      next[value] = people.filter((p) => matchesRosterFilter(p, value, event.hasEnded)).map((p) => p.contactId);
    }
    return next;
  }, [people, event.hasEnded]);

  const drawerAudience = followUpAudienceFromFilter(filter, event.hasEnded);
  const showOffer = shouldOfferFollowUp({
    hasEnded: event.hasEnded,
    checkedInCount: counts.checked_in,
    hasOpenFollowUp: Boolean(existingFollowUp),
    dismissed: offerDismissed,
  });

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
    setSelectionTouched(true);
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

  function toggleSelected(contactId: string) {
    setSelectionTouched(true);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) next.delete(contactId);
      else next.add(contactId);
      return next;
    });
  }

  function toggleAllFiltered() {
    setSelectionTouched(true);
    const ids = filtered.map((p) => p.contactId);
    const allOn = ids.length > 0 && ids.every((id) => selected.has(id));
    setSelected(allOn ? new Set() : new Set(ids));
  }

  function dismissOffer() {
    setOfferDismissed(true);
    try {
      window.localStorage.setItem(offerStorageKey(event.key), "1");
    } catch {
      /* ignore quota / private mode */
    }
  }

  function startWalk(audience: EventFollowUpAudience | null = filter) {
    setWalkAudience(audience);
    setWalkOpen(true);
  }

  const when = event.startsAt ?? event.date;
  const messageIds = selected.size > 0 ? [...selected] : registrantIdsForMessage(people);
  const visibleChips = FILTER_CHIPS.filter((chip) => !chip.pastOnly || event.hasEnded);
  const walkPeople = walkAudience ? people.filter((p) => matchesRosterFilter(p, walkAudience, event.hasEnded)) : people;
  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.contactId));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[13px] text-neutral-400">
            <Link href="/events" className="hover:text-neutral-600">
              Back to events
            </Link>
          </p>
          <h1 className="mt-2 flex flex-wrap items-center gap-2.5 font-display text-[32px] font-semibold tracking-[-0.03em] text-neutral-900">
            <Users size={28} className="text-[#c45c4a]" />
            {event.label}
            {event.hasEnded && (
              <span className="rounded-full bg-[#f3e4dc] px-2.5 py-1 text-[12px] font-semibold text-[#c45c4a]">Past event</span>
            )}
          </h1>
          <p className="mt-1 text-[15px] text-neutral-500">
            {formatLocal(when, "MMMM d")}
            {event.startsAt ? ` · ${formatLocal(event.startsAt, "h:mm a")}` : ""}
            {event.endsAt ? `–${formatLocal(event.endsAt, "h:mm a")}` : ""}
            {` · ${eventPlaceLabel(event.location, event.seriesLabel)}`}
            {` · ${daysOutLabel(when)}`}
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
        {event.hasEnded && (
          <button type="button" onClick={() => setDrawerOpen(true)} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#c45c4a]">
            <ListTodo size={15} /> Create follow-up task
          </button>
        )}
      </div>

      {showOffer && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[#eadfd6] bg-white px-4 py-3.5">
          <p className="text-[15px] font-medium text-neutral-800">Follow up attendees tomorrow?</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setFilter("checked_in");
                setSelectionTouched(false);
                setDrawerOpen(true);
              }}
              className="rounded-xl bg-[#c45c4a] px-3.5 py-2 text-[13px] font-semibold text-white"
            >
              Create follow-up task
            </button>
            <button type="button" onClick={dismissOffer} className="rounded-xl px-3 py-2 text-[13px] font-medium text-neutral-500">
              Not now
            </button>
          </div>
        </div>
      )}

      {existingFollowUp && (
        <p className="mt-4 text-[13px] text-neutral-500">
          Follow-up already on Today: <span className="font-medium text-neutral-800">{existingFollowUp.title}</span>
          {existingFollowUp.dueAt ? ` · due ${formatLocal(existingFollowUp.dueAt, "MMM d")}` : ""}.
        </p>
      )}

      {walkOpen && (
        <div className="mt-5">
          <RosterTextAndNext event={{ ...event, people: walkPeople }} />
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
        <div className="inline-flex flex-wrap rounded-full bg-[#f3e4dc]/60 p-1">
          {visibleChips.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setFilter(opt.value);
                setSelectionTouched(false);
              }}
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
        <div className="grid grid-cols-[auto_minmax(0,1.6fr)_1fr_0.9fr_0.8fr_1fr_auto_auto] items-center gap-3 border-b border-[#eadfd6] px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[.06em] text-neutral-400">
          <span className="w-8" />
          <span>Name</span>
          <span>Status</span>
          <span>First-timer?</span>
          <span>Phone</span>
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
                className="grid grid-cols-[auto_minmax(0,1.6fr)_1fr_0.9fr_0.8fr_1fr_auto_auto] items-center gap-3 border-b border-neutral-100 px-4 py-3 last:border-b-0"
              >
                <div className="w-8">
                  {event.hasEnded && (
                    <input
                      type="checkbox"
                      checked={selected.has(p.contactId)}
                      onChange={() => toggleSelected(p.contactId)}
                      className="h-4 w-4 rounded border-neutral-300"
                    />
                  )}
                </div>
                <Link href={`/contacts/${p.contactId}`} className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f3e4dc] text-[12px] font-semibold text-[#c45c4a]">
                    {initials(p.firstName, p.lastName)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold text-neutral-900">{p.name || "Unnamed"}</span>
                    {p.email && <span className="block truncate text-[12px] text-neutral-400">{p.email}</span>}
                  </span>
                </Link>
                <span>
                  <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-medium", statusChipClass(status))}>{status}</span>
                </span>
                <span className="text-[13px] text-neutral-600">
                  {p.isFirstTimer ? (
                    <span className="inline-flex items-center gap-1 font-medium text-[#c45c4a]">
                      <Sprout size={14} /> Yes
                    </span>
                  ) : (
                    "No"
                  )}
                </span>
                <span className="truncate text-[13px] text-neutral-600">{p.phone ? formatPhone(p.phone) : "—"}</span>
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
                      onChange={() => toggleSelected(p.contactId)}
                      className="mt-1 h-4 w-4 rounded border-neutral-300"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] font-semibold text-neutral-900">{p.name || "Unnamed"}</p>
                    <p className="mt-0.5 text-[13px] text-neutral-500">{p.phone ? formatPhone(p.phone) : "No phone"} · {p.email ?? "—"}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2">
                      <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-medium", statusChipClass(status))}>{status}</span>
                      {p.isFirstTimer && (
                        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#c45c4a]">
                          <Sprout size={13} /> First-timer
                        </span>
                      )}
                      <span className="text-[12px] text-neutral-400">{lastActivityLabels[p.contactId] ?? ""}</span>
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

      {event.hasEnded && (
        <div className="sticky bottom-3 z-20 mt-4 flex flex-wrap items-center gap-3 rounded-[16px] border border-[#eadfd6] bg-white px-4 py-3 shadow-card">
          <label className="inline-flex items-center gap-2 text-[13px] font-medium text-neutral-700">
            <input type="checkbox" checked={allFilteredSelected} onChange={toggleAllFiltered} className="h-4 w-4 rounded border-neutral-300" />
            {selected.size} attendee{selected.size === 1 ? "" : "s"} selected
          </label>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <button
              type="button"
              onClick={() => startWalk(filter)}
              className="rounded-xl border border-[#eadfd6] bg-white px-3 py-1.5 text-[13px] font-semibold text-neutral-800"
            >
              Text &amp; Next
            </button>
            <button
              type="button"
              onClick={() => setMessageOpen(true)}
              className="rounded-xl border border-[#eadfd6] bg-white px-3 py-1.5 text-[13px] font-semibold text-neutral-800"
            >
              Message all
            </button>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#c45c4a] px-3 py-1.5 text-[13px] font-semibold text-white"
            >
              <ListTodo size={14} /> Create follow-up task
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-neutral-400">
          {event.hasEnded
            ? "Checked in is the default. No-shows stay out of follow-up unless you flip that filter."
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
        <MessageRegistrantsModal
          eventKey={event.key}
          eventLabel={event.label}
          contactIds={messageIds}
          audience={event.hasEnded ? filter : null}
          onClose={() => setMessageOpen(false)}
        />
      )}
      {drawerOpen && event.hasEnded && (
        <FollowUpTaskDrawer
          eventKey={event.key}
          eventLabel={event.label}
          hasEnded={event.hasEnded}
          audienceCounts={counts}
          peopleByAudience={peopleByAudience}
          initialAudience={drawerAudience}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
}
