"use client";

import { useState } from "react";
import Link from "next/link";
import { Phone, MessageSquareText, X } from "lucide-react";
import { openQuoCall, openQuoText } from "@/lib/quo/call-link";
import { initials } from "@/lib/utils";
import type { WorklistPerson } from "@/lib/data/today";

const CAP = 10;

// Shared row treatment for Calls / Replies owed / Registered-no-follow-up -
// same person-row shape as ContactRow, just without the expand/edit
// affordances (this is a worklist, not the record itself; "Open full
// record" lives one click away via the name link). onDismiss (keyed by
// activityId) is opt-in for Replies owed; onDismissContact (keyed by
// contact id, with its own label) is opt-in for any group whose dismiss
// isn't tied to a specific activity - Calls ("clear this follow-up") and
// Registered-no-follow-up ("no action needed") both use it. Both of those
// groups used to have no dismiss at all, so a stale entry reappeared every
// single day with no way to say "I don't need to act on this."
export function WorklistGroup({
  people,
  onDismiss,
  onDismissContact,
  dismissContactLabel = "Dismiss",
}: {
  people: WorklistPerson[];
  onDismiss?: (activityId: string) => Promise<{ ok: boolean }>;
  onDismissContact?: (contactId: string) => Promise<{ ok: boolean }>;
  dismissContactLabel?: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [dismissing, setDismissing] = useState<string | null>(null);

  const remaining = people.filter((p) => !dismissed.has(p.activityId ?? p.id));
  const visible = showAll ? remaining : remaining.slice(0, CAP);

  async function handleDismiss(activityId: string) {
    if (!onDismiss) return;
    setDismissing(activityId);
    await onDismiss(activityId);
    setDismissing(null);
    setDismissed((prev) => new Set(prev).add(activityId));
  }

  async function handleDismissContact(contactId: string) {
    if (!onDismissContact) return;
    setDismissing(contactId);
    await onDismissContact(contactId);
    setDismissing(null);
    setDismissed((prev) => new Set(prev).add(contactId));
  }

  if (remaining.length === 0) {
    return <p className="px-4 py-6 text-[15px] text-neutral-400">Nothing here right now.</p>;
  }

  return (
    <div>
      {visible.map((person) => (
        <div key={person.id} className="flex items-center gap-3.5 border-b border-neutral-100 px-4 py-3.5 last:border-b-0">
          <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[15px] font-semibold text-neutral-600">
            {initials(person.name.split(" ")[0] ?? "", person.name.split(" ").slice(1).join(" "))}
          </div>
          <Link href={`/contacts/${person.id}`} className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-semibold leading-6 text-neutral-900">{person.name}</p>
            <p className={`truncate text-[15px] leading-[22px] ${person.late ? "font-medium text-[#b91c1c]" : "text-neutral-600"}`}>{person.meta}</p>
          </Link>
          {person.phone && (
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => openQuoCall(person.phone!)}
                className="flex items-center gap-1.5 rounded-[10px] border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-800"
              >
                <Phone size={15} className="text-neutral-500" /> Call
              </button>
              <button
                type="button"
                onClick={() => openQuoText(person.phone!)}
                className="flex items-center gap-1.5 rounded-[10px] border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-800"
              >
                <MessageSquareText size={15} className="text-neutral-500" /> Text
              </button>
            </div>
          )}
          {onDismiss && person.activityId && (
            <button
              type="button"
              onClick={() => handleDismiss(person.activityId!)}
              disabled={dismissing === person.activityId}
              title="I don't need to reply to this"
              className="shrink-0 rounded-[10px] border border-neutral-200 bg-white p-2 text-neutral-400 disabled:opacity-50"
            >
              <X size={15} />
            </button>
          )}
          {onDismissContact && (
            <button
              type="button"
              onClick={() => handleDismissContact(person.id)}
              disabled={dismissing === person.id}
              title={dismissContactLabel}
              className="shrink-0 rounded-[10px] border border-neutral-200 bg-white p-2 text-neutral-400 disabled:opacity-50"
            >
              <X size={15} />
            </button>
          )}
        </div>
      ))}
      {!showAll && remaining.length > CAP && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full px-4 py-3.5 text-left text-[15px] font-semibold text-neutral-500"
        >
          Show the rest ({remaining.length - CAP} more)
        </button>
      )}
    </div>
  );
}
