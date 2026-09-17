"use client";

import { useState } from "react";
import Link from "next/link";
import { Phone, MessageSquareText, Mail } from "lucide-react";
import { openQuoCall, openQuoText } from "@/lib/quo/call-link";
import { initials } from "@/lib/utils";
import { RegisteredRowMenu } from "@/components/dashboard/RegisteredRowMenu";
import { SendEmailForm } from "@/components/contacts/SendEmailForm";
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
  dismissLabel = "Dismiss",
  onDismissContact,
  dismissContactLabel = "Dismiss",
  onNeverQueue,
}: {
  people: WorklistPerson[];
  onDismiss?: (activityId: string) => Promise<{ ok: boolean }>;
  dismissLabel?: string;
  onDismissContact?: (contactId: string) => Promise<{ ok: boolean }>;
  dismissContactLabel?: string;
  // Registered-no-follow-up only: a second, permanent dismissal
  // (markKnownPersonally) alongside onDismissContact's "not this time" -
  // renders as a two-option menu instead of a single button when present.
  onNeverQueue?: (contactId: string) => Promise<{ ok: boolean }>;
}) {
  const [showAll, setShowAll] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [emailOpenId, setEmailOpenId] = useState<string | null>(null);

  const remaining = people.filter((p) => !dismissed.has(p.activityId ?? p.id));
  const visible = showAll ? remaining : remaining.slice(0, CAP);

  async function handleDismiss(activityId: string) {
    if (!onDismiss) return;
    setDismissing(activityId);
    const result = await onDismiss(activityId);
    setDismissing(null);
    if (result?.ok) {
      setDismissed((prev) => new Set(prev).add(activityId));
    }
  }

  async function handleDismissContact(contactId: string) {
    if (!onDismissContact) return;
    setDismissing(contactId);
    const result = await onDismissContact(contactId);
    setDismissing(null);
    if (result?.ok) {
      setDismissed((prev) => new Set(prev).add(contactId));
    }
  }

  async function handleNeverQueue(contactId: string) {
    if (!onNeverQueue) return;
    setDismissing(contactId);
    const result = await onNeverQueue(contactId);
    setDismissing(null);
    if (result?.ok) {
      setDismissed((prev) => new Set(prev).add(contactId));
    }
  }

  if (remaining.length === 0) {
    return <p className="px-4 py-6 text-[15px] text-neutral-400">Nothing here right now.</p>;
  }

  return (
    <div>
      {visible.map((person) => (
        <div key={person.id} className="border-b border-neutral-100 last:border-b-0">
        <div className="flex items-center gap-3.5 px-4 py-3.5">
          <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[15px] font-semibold text-neutral-600">
            {initials(person.name.split(" ")[0] ?? "", person.name.split(" ").slice(1).join(" "))}
          </div>
          <Link href={`/contacts/${person.id}`} className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-semibold leading-6 text-neutral-900">{person.name}</p>
            <p className={`truncate text-[15px] leading-[22px] ${person.late ? "font-medium text-[#b91c1c]" : "text-neutral-600"}`}>{person.meta}</p>
          </Link>
          {person.phone ? (
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
          ) : (
            // No phone on file - Call/Text have nothing to open, and
            // without this, a phone-less person had zero way to log
            // outreach at all short of leaving the worklist entirely for
            // their contact page. Sends via Gmail and logs an activity
            // the same as Call/Text do, so the "no follow-up" flag they
            // triggered actually clears once this fires.
            person.email && (
              <button
                type="button"
                onClick={() => setEmailOpenId((v) => (v === person.id ? null : person.id))}
                className={`flex shrink-0 items-center gap-1.5 rounded-[10px] border px-3 py-2 text-sm font-semibold ${emailOpenId === person.id ? "border-brand-300 bg-brand-50 text-brand-700" : "border-neutral-200 bg-white text-neutral-800"}`}
              >
                <Mail size={15} className={emailOpenId === person.id ? "text-brand-600" : "text-neutral-500"} /> Email
              </button>
            )
          )}
          {onDismiss && person.activityId && (
            <button
              type="button"
              onClick={() => handleDismiss(person.activityId!)}
              disabled={dismissing === person.activityId}
              className="shrink-0 whitespace-nowrap rounded-[10px] border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-500 disabled:opacity-50"
            >
              {dismissLabel}
            </button>
          )}
          {onDismissContact && onNeverQueue ? (
            <RegisteredRowMenu
              label={dismissContactLabel}
              busy={dismissing === person.id}
              onNotThisTime={() => handleDismissContact(person.id)}
              onNeverQueue={() => handleNeverQueue(person.id)}
            />
          ) : (
            onDismissContact && (
              <button
                type="button"
                onClick={() => handleDismissContact(person.id)}
                disabled={dismissing === person.id}
                className="shrink-0 whitespace-nowrap rounded-[10px] border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-500 disabled:opacity-50"
              >
                {dismissContactLabel}
              </button>
            )
          )}
        </div>
        {emailOpenId === person.id && person.email && (
          <div className="border-t border-neutral-100 bg-neutral-50 px-4 py-2.5">
            <SendEmailForm contactId={person.id} email={person.email} />
          </div>
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
