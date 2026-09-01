"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronRight, Download, Phone, MessageSquareText, UserCheck, PhoneOff, Trash2, Merge } from "lucide-react";
import { openQuoCall, openQuoText } from "@/lib/quo/call-link";
import { formatLocal } from "@/lib/format-time";
import { formatPhone, cn } from "@/lib/utils";
import { markContactAttended } from "@/app/(app)/reports/actions";
import { deleteEventByEventId, deleteEventByKey, mergeEventInto } from "@/app/(app)/events/actions";
import { TextBlastModal } from "@/components/contacts/TextBlastModal";
import type { EventEntry, RosterPerson } from "@/lib/data/events";

type OtherEvent = { eventId: string; label: string; date: string };

type StatusFilter = "all" | "registered" | "attended" | "no_show" | "walk_in";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "registered", label: "Registered" },
  { value: "attended", label: "Attended" },
  { value: "no_show", label: "No-shows" },
  { value: "walk_in", label: "Walk-ins" },
];

function matchesFilter(p: RosterPerson, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "registered") return p.registered;
  if (filter === "attended") return p.attended;
  if (filter === "no_show") return p.registered && !p.attended;
  return p.attended && !p.registered;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

function historyLabel(p: RosterPerson): string {
  if (p.attendanceNumber <= 0) return "—";
  if (p.attendanceNumber === 1) return "First time";
  return `${ordinal(p.attendanceNumber)} event`;
}

export function EventRosterCard({
  event,
  defaultOpen = false,
  otherEvents = [],
}: {
  event: EventEntry;
  defaultOpen?: boolean;
  otherEvents?: OtherEvent[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [markedAttended, setMarkedAttended] = useState<Set<string>>(new Set());
  const [marking, setMarking] = useState<string | null>(null);
  const [textTarget, setTextTarget] = useState<{ contactIds: string[]; label: string } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [mergeMenuOpen, setMergeMenuOpen] = useState(false);
  const [mergeTarget, setMergeTarget] = useState<OtherEvent | null>(null);
  const [merging, setMerging] = useState(false);
  const [mergeError, setMergeError] = useState("");

  const people = event.people.map((p) => (markedAttended.has(p.contactId) ? { ...p, attended: true } : p));
  const filtered = people.filter((p) => matchesFilter(p, filter));

  async function markAttended(contactId: string) {
    setMarking(contactId);
    setMarkedAttended((prev) => new Set(prev).add(contactId));
    await markContactAttended(contactId, event.series, event.eventId);
    setMarking(null);
    router.refresh();
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

  async function handleMerge() {
    if (!event.eventId || !mergeTarget) return;
    setMerging(true);
    setMergeError("");
    const result = await mergeEventInto(event.eventId, mergeTarget.eventId);
    if (result.ok) {
      router.refresh();
    } else {
      setMerging(false);
      setMergeError(result.error);
    }
  }

  const showRate = event.counts.registered > 0 ? Math.round((event.counts.attended / event.counts.registered) * 100) : null;
  const attendedIds = people.filter((p) => p.attended).map((p) => p.contactId);
  const noShowIds = people.filter((p) => p.registered && !p.attended).map((p) => p.contactId);

  const counts: Record<StatusFilter, number> = {
    all: people.length,
    registered: event.counts.registered,
    attended: event.counts.attended,
    no_show: event.counts.noShow,
    walk_in: event.counts.walkIn,
  };

  return (
    <div className="rounded-2xl border border-[#ebe9e7] bg-white">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 px-[18px] py-4 text-left">
        <span className="shrink-0 text-neutral-400">{open ? <ChevronDown size={17} /> : <ChevronRight size={17} />}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-semibold leading-6 text-neutral-900">{event.label}</p>
          <p className="truncate text-[15px] leading-[22px] text-neutral-600">
            {formatLocal(event.date, "EEEE, MMMM d")} · {event.seriesLabel}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-semibold text-neutral-900">
            {event.counts.attended} of {event.counts.registered}
          </p>
          <p className="text-sm text-neutral-500">
            {showRate !== null ? `${showRate}% showed` : "no registrations"}
            {event.counts.walkIn > 0 ? ` · ${event.counts.walkIn} walk-in${event.counts.walkIn === 1 ? "" : "s"}` : ""}
          </p>
        </div>
      </button>

      {open && (
        <div className="border-t border-neutral-100">
          <div className="flex flex-wrap items-center gap-2 bg-[#fcfbfa] px-[18px] py-3">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilter(opt.value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium",
                  filter === opt.value ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-700",
                )}
              >
                {opt.label} · {counts[opt.value]}
              </button>
            ))}
            <a
              href={`/api/events/export?event=${encodeURIComponent(event.key)}&status=${filter}`}
              className="ml-auto flex items-center gap-1.5 text-sm font-semibold text-brand-700"
            >
              <Download size={14} /> Download this roster
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100 text-left text-sm font-semibold text-neutral-500">
                  <th className="px-[18px] py-2.5 font-semibold">Name and contact</th>
                  <th className="w-[110px] px-2 py-2.5 font-semibold">Status</th>
                  <th className="w-[96px] px-2 py-2.5 font-semibold">History</th>
                  <th className="w-[132px] px-[18px] py-2.5 font-semibold">&nbsp;</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-[18px] py-6 text-[15px] text-neutral-400">
                      No one matches this filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const statusLabel = p.registered && p.attended ? "Attended" : p.registered ? "No-show" : "Walk-in";
                    return (
                      <tr key={p.contactId} className="border-b border-neutral-100 last:border-b-0">
                        <td className="px-[18px] py-3">
                          <p className="text-base font-semibold text-neutral-900">{p.name || "Unnamed"}</p>
                          {p.phone ? (
                            <p className="text-sm text-neutral-500">{[formatPhone(p.phone), p.email].filter(Boolean).join(" · ")}</p>
                          ) : (
                            <p className="flex items-center gap-1.5 text-sm text-neutral-500">
                              <PhoneOff size={13} className="text-neutral-400" /> no phone number
                            </p>
                          )}
                        </td>
                        <td className={cn("px-2 py-3 text-[15px] font-semibold", statusLabel === "No-show" ? "text-[#b91c1c]" : "text-neutral-900")}>
                          {statusLabel}
                        </td>
                        <td className="px-2 py-3 text-sm text-neutral-500">{historyLabel(p)}</td>
                        <td className="px-[18px] py-3">
                          {!p.attended ? (
                            <button
                              type="button"
                              onClick={() => markAttended(p.contactId)}
                              disabled={marking === p.contactId}
                              className="flex items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-neutral-200 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 disabled:opacity-50"
                            >
                              <UserCheck size={14} /> {marking === p.contactId ? "Marking…" : "Mark attended"}
                            </button>
                          ) : p.phone ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openQuoCall(p.phone!)}
                                className="rounded-[10px] border border-neutral-200 bg-white p-1.5 text-neutral-500"
                              >
                                <Phone size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => openQuoText(p.phone!)}
                                className="rounded-[10px] border border-neutral-200 bg-white p-1.5 text-neutral-500"
                              >
                                <MessageSquareText size={14} />
                              </button>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {(attendedIds.length > 0 || noShowIds.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 bg-[#fcfbfa] px-[18px] py-3">
              {attendedIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTextTarget({ contactIds: attendedIds, label: `${event.label} — attended` })}
                  className="rounded-[10px] border border-neutral-200 bg-white px-3.5 py-2 text-sm font-semibold text-neutral-800"
                >
                  Text the {attendedIds.length} who came
                </button>
              )}
              {noShowIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTextTarget({ contactIds: noShowIds, label: `${event.label} — no-shows` })}
                  className="rounded-[10px] border border-neutral-200 bg-white px-3.5 py-2 text-sm font-semibold text-neutral-800"
                >
                  Re-invite the {noShowIds.length} no-shows
                </button>
              )}
              <Link href="/dialer" className="rounded-[10px] border border-neutral-200 bg-white px-3.5 py-2 text-sm font-semibold text-neutral-800">
                Add all {people.length} to the dialer
              </Link>
            </div>
          )}
          <p className="border-t border-neutral-100 px-[18px] py-2.5 text-sm text-neutral-400">
            Registered but not checked in counts as a no-show until you mark them attended.
          </p>

          <div className="border-t border-neutral-100 px-[18px] py-3">
              {mergeTarget ? (
                <div className="flex flex-wrap items-center gap-2.5">
                  <p className="text-sm text-neutral-600">
                    Combine into <span className="font-semibold">{mergeTarget.label}</span> ({formatLocal(mergeTarget.date, "MMM d")})? All{" "}
                    {people.length} {people.length === 1 ? "person" : "people"} move over and this listing goes away. This can&apos;t be undone.
                  </p>
                  <button
                    type="button"
                    onClick={handleMerge}
                    disabled={merging}
                    className="rounded-[10px] bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {merging ? "Combining…" : "Combine"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMergeTarget(null)}
                    disabled={merging}
                    className="rounded-[10px] border border-neutral-200 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-700 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  {mergeError && <p className="w-full text-sm text-red-600">{mergeError}</p>}
                </div>
              ) : confirmingDelete ? (
                <div className="flex flex-wrap items-center gap-2.5">
                  <p className="text-sm text-neutral-600">
                    Delete this event and its {people.length} {people.length === 1 ? "person" : "people"}? This can&apos;t be undone.
                  </p>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="rounded-[10px] bg-red-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {deleting ? "Deleting…" : "Delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    disabled={deleting}
                    className="rounded-[10px] border border-neutral-200 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-700 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  {deleteError && <p className="w-full text-sm text-red-600">{deleteError}</p>}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3.5">
                  {event.eventId && otherEvents.length > 0 && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setMergeMenuOpen((v) => !v)}
                        className="flex items-center gap-1.5 text-sm font-medium text-brand-700"
                      >
                        <Merge size={14} /> Combine with another listing (duplicate)
                      </button>
                      {mergeMenuOpen && (
                        <>
                          <button type="button" aria-label="Close menu" onClick={() => setMergeMenuOpen(false)} className="fixed inset-0 z-30 cursor-default" />
                          <div className="absolute left-0 top-full z-40 mt-1 max-h-64 w-72 overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
                            {otherEvents.map((o) => (
                              <button
                                key={o.eventId}
                                type="button"
                                onClick={() => {
                                  setMergeMenuOpen(false);
                                  setMergeTarget(o);
                                }}
                                className="block w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                              >
                                <span className="block font-medium text-neutral-900">{o.label}</span>
                                <span className="block text-neutral-500">{formatLocal(o.date, "MMM d, yyyy")}</span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    className="flex items-center gap-1.5 text-sm font-medium text-red-600"
                  >
                    <Trash2 size={14} /> Remove entirely
                  </button>
                </div>
              )}
          </div>
        </div>
      )}

      {textTarget && (
        <TextBlastModal target={{ kind: "contacts", contactIds: textTarget.contactIds, label: textTarget.label }} onClose={() => setTextTarget(null)} />
      )}
    </div>
  );
}
