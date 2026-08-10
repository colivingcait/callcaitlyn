"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Phone, Clock } from "lucide-react";
import { openQuoCall } from "@/lib/quo/call-link";
import { markDialerConnected, markDialerSnoozed } from "@/app/(app)/dialer/actions";
import { DialerNotesModal } from "@/components/dialer/DialerNotesModal";
import { Button } from "@/components/ui";
import { fullName, formatPhone, initials } from "@/lib/utils";
import type { DialerContact } from "@/lib/data/dialer";
import type { PipelineStage } from "@/types/database";

export function DialerQueue({ contacts, stages }: { contacts: DialerContact[]; stages: PipelineStage[] }) {
  const router = useRouter();
  const [outcomeFor, setOutcomeFor] = useState<DialerContact | null>(null);
  const [notesFor, setNotesFor] = useState<DialerContact | null>(null);
  const pendingRef = useRef<DialerContact | null>(null);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "visible" && pendingRef.current) {
        setOutcomeFor(pendingRef.current);
        pendingRef.current = null;
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  function call(contact: DialerContact) {
    if (!contact.phone) return;
    pendingRef.current = contact;
    openQuoCall(contact.phone);
  }

  async function handleConnected() {
    if (!outcomeFor) return;
    const contact = outcomeFor;
    setOutcomeFor(null);
    await markDialerConnected(contact.id);
    setNotesFor(contact);
    router.refresh();
  }

  async function handleNoAnswer() {
    if (!outcomeFor) return;
    await markDialerSnoozed(outcomeFor.id);
    setOutcomeFor(null);
    router.refresh();
  }

  if (contacts.length === 0) {
    return <p className="px-4 py-10 text-center text-sm text-neutral-400">Nobody left to call — you&apos;re caught up.</p>;
  }

  return (
    <div className="space-y-2 px-4 pb-24">
      {contacts.map((contact) => (
        <div
          key={contact.id}
          className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3.5 shadow-card"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
            {initials(contact.first_name, contact.last_name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-neutral-900">{fullName(contact)}</p>
            <p className="truncate text-xs text-neutral-500">{formatPhone(contact.phone)}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-neutral-400">
              {contact.lead_source && <span className="truncate">{contact.lead_source}</span>}
              {contact.last_event_name && <span className="truncate">· {contact.last_event_name}</span>}
              {contact.dialer_snoozed_at && (
                <span className="flex items-center gap-0.5 text-amber-600">
                  <Clock size={10} /> Tried {formatDistanceToNow(new Date(contact.dialer_snoozed_at), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => call(contact)}
            aria-label={`Call ${fullName(contact)}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white active:bg-brand-700"
          >
            <Phone size={18} />
          </button>
        </div>
      ))}

      {outcomeFor && (
        <div className="fixed inset-x-0 bottom-16 z-40 border-t border-neutral-200 bg-white p-4 shadow-lg md:bottom-0">
          <div className="mx-auto flex max-w-3xl flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-neutral-800">Just called {fullName(outcomeFor)} — how&apos;d it go?</p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={handleNoAnswer} className="flex-1 sm:flex-initial">
                No answer / voicemail
              </Button>
              <Button size="sm" onClick={handleConnected} className="flex-1 sm:flex-initial">
                Connected
              </Button>
            </div>
          </div>
        </div>
      )}

      {notesFor && (
        <DialerNotesModal
          contactId={notesFor.id}
          contactName={fullName(notesFor)}
          currentStageId={notesFor.stage_id}
          stages={stages}
          onClose={() => setNotesFor(null)}
        />
      )}
    </div>
  );
}
