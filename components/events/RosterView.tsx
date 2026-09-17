"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Phone, MessageSquareText, UserCheck, PhoneOff, Trash2 } from "lucide-react";
import { openQuoCall, openQuoText } from "@/lib/quo/call-link";
import { formatPhone, cn } from "@/lib/utils";
import { markContactAttended, deleteEventByEventId, deleteEventByKey } from "@/app/(app)/events/actions";
import { TextBlastModal } from "@/components/contacts/TextBlastModal";
import type { EventEntry, RosterPerson } from "@/lib/data/events";

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

// Cards instead of the old accordion's table - a five-column table breaks
// at phone width, and this is a view she opens standing at a desk as often
// as on her phone. Merge-with-duplicate lives on the Events index now (the
// portal proactively flags same-day pairs there); this view keeps only the
// actions that are genuinely per-event: mark attended, bulk text, delete.
export function RosterView({ event }: { event: EventEntry }) {
  const router = useRouter();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [markedAttended, setMarkedAttended] = useState<Set<string>>(new Set());
  const [marking, setMarking] = useState<string | null>(null);
  const [textTarget, setTextTarget] = useState<{ contactIds: string[]; label: string } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const people = event.people.map((p) => (markedAttended.has(p.contactId) ? { ...p, attended: true } : p));
  const filtered = people.filter((p) => matchesFilter(p, filter));
  const firstTimers = people.filter((p) => p.attended && p.attendanceNumber === 1).length;
  const regulars = people.filter((p) => p.attended && p.attendanceNumber >= 4).length;

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
    <div>
      {event.counts.attended > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-[#ebe9e7] bg-white px-4 py-3">
            <p className="text-2xl font-semibold text-neutral-900">{firstTimers}</p>
            <p className="text-sm text-neutral-500">First-timers</p>
          </div>
          <div className="rounded-2xl border border-[#ebe9e7] bg-white px-4 py-3">
            <p className="text-2xl font-semibold text-neutral-900">{regulars}</p>
            <p className="text-sm text-neutral-500">Regulars (4+)</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
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
      </div>

      <div className="mt-3 space-y-2">
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-[#ebe9e7] bg-white px-4 py-6 text-center text-[15px] text-neutral-400">No one matches this filter.</p>
        ) : (
          filtered.map((p) => {
            const statusLabel = p.registered && p.attended ? "Attended" : p.registered ? "No-show" : "Walk-in";
            return (
              <div key={p.contactId} className="flex items-center gap-3 rounded-2xl border border-[#ebe9e7] bg-white px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-neutral-900">{p.name || "Unnamed"}</p>
                  {p.phone ? (
                    <p className="truncate text-sm text-neutral-500">{[formatPhone(p.phone), p.email].filter(Boolean).join(" · ")}</p>
                  ) : (
                    <p className="flex items-center gap-1.5 text-sm text-neutral-500">
                      <PhoneOff size={13} className="text-neutral-400" /> no phone number
                    </p>
                  )}
                  <p className={cn("mt-0.5 text-sm font-semibold", statusLabel === "No-show" ? "text-[#b91c1c]" : "text-neutral-600")}>
                    {statusLabel} · {historyLabel(p)}
                  </p>
                </div>
                <div className="shrink-0">
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
                </div>
              </div>
            );
          })
        )}
      </div>

      {(attendedIds.length > 0 || noShowIds.length > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-[#ebe9e7] bg-[#fcfbfa] px-4 py-3">
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
            Add all {people.length} to Event calls
          </Link>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-sm text-neutral-400">Registered but not checked in counts as a no-show until you mark them attended.</p>
        {confirmingDelete ? (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="whitespace-nowrap rounded-[10px] bg-red-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Confirm delete"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
              className="rounded-[10px] border border-neutral-200 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-700 disabled:opacity-50"
            >
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

      {textTarget && (
        <TextBlastModal target={{ kind: "contacts", contactIds: textTarget.contactIds, label: textTarget.label }} onClose={() => setTextTarget(null)} />
      )}
    </div>
  );
}
