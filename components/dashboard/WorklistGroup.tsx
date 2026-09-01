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
// record" lives one click away via the name link). onDismiss is opt-in
// (only Replies owed passes it) and only renders for a row that actually
// has an activityId to dismiss - Calls/Registered rows are keyed by
// contact, not a single message, so there's nothing there to dismiss.
export function WorklistGroup({ people, onDismiss }: { people: WorklistPerson[]; onDismiss?: (activityId: string) => Promise<{ ok: boolean }> }) {
  const [showAll, setShowAll] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [dismissing, setDismissing] = useState<string | null>(null);

  const remaining = people.filter((p) => !p.activityId || !dismissed.has(p.activityId));
  const visible = showAll ? remaining : remaining.slice(0, CAP);

  async function handleDismiss(activityId: string) {
    if (!onDismiss) return;
    setDismissing(activityId);
    await onDismiss(activityId);
    setDismissing(null);
    setDismissed((prev) => new Set(prev).add(activityId));
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
