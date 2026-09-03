"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Clock, Phone, ChevronRight, History } from "lucide-react";
import Link from "next/link";
import { Avatar, Badge } from "@/components/ui";
import { openQuoCall } from "@/lib/quo/call-link";
import { sendTextToContact } from "@/app/(app)/contacts/actions";
import {
  markDialerConnected,
  markDialerSnoozed,
  markDialerDismissed,
  markEventFollowupConnected,
  markEventFollowupSnoozed,
  markEventFollowupDismissed,
} from "@/app/(app)/dialer/actions";
import { newRegistrationTemplate, returningRegistrationTemplate } from "@/lib/crm/event-text-templates";
import { applyMergeFields } from "@/lib/crm/merge-fields";
import { fullName, formatPhone, cn } from "@/lib/utils";
import type { DialerContact, DialerMode } from "@/lib/data/dialer";
import type { TextTemplate } from "@/types/database";

export function PersonCard({
  contact,
  mode,
  defaultDraftTemplate,
  onAdvance,
}: {
  contact: DialerContact;
  mode: DialerMode;
  defaultDraftTemplate: TextTemplate | null;
  onAdvance: () => void;
}) {
  const router = useRouter();
  const eventName = mode === "new-registration" ? contact.registrationLabel : contact.last_event_name;
  const eventAccount = mode === "new-registration" ? contact.registrationAccount : null;

  const templates: { label: string; body: string }[] = [];
  if (mode === "new-registration" && contact.isNew !== false) {
    templates.push({ label: "Welcome / intro", body: newRegistrationTemplate(contact.first_name, eventAccount, eventName) });
  }
  if (mode === "new-registration" && contact.isNew !== true) {
    templates.push({ label: "Welcome back", body: returningRegistrationTemplate(contact.first_name, eventAccount, eventName) });
  }
  templates.push({
    label: defaultDraftTemplate?.label ?? "Quick text",
    body: defaultDraftTemplate ? applyMergeFields(defaultDraftTemplate.body, contact) : "",
  });

  const [draft, setDraft] = useState(templates[0]?.body ?? "");
  const [activeTemplate, setActiveTemplate] = useState(0);
  const [called, setCalled] = useState(false);
  const [sending, setSending] = useState(false);
  const [marking, setMarking] = useState(false);

  function pickTemplate(i: number) {
    setActiveTemplate(i);
    setDraft(templates[i]?.body ?? "");
  }

  async function sendAndNext() {
    if (!contact.phone || !draft.trim()) return;
    setSending(true);
    const res = await sendTextToContact(contact.id, contact.phone, draft.trim());
    setSending(false);
    if (res.ok) {
      if (mode === "event-followup") await markEventFollowupConnected(contact.id);
      else await markDialerConnected(contact.id);
      router.refresh();
      onAdvance();
    }
  }

  function callInstead() {
    if (!contact.phone) return;
    setCalled(true);
    openQuoCall(contact.phone);
  }

  async function outcome(kind: "connected" | "no-answer") {
    setMarking(true);
    if (mode === "event-followup") {
      if (kind === "connected") await markEventFollowupConnected(contact.id);
      else await markEventFollowupSnoozed(contact.id);
    } else {
      if (kind === "connected") await markDialerConnected(contact.id);
      else await markDialerSnoozed(contact.id);
    }
    setMarking(false);
    router.refresh();
    onAdvance();
  }

  async function skip() {
    setMarking(true);
    if (mode === "event-followup") await markEventFollowupDismissed(contact.id);
    else await markDialerDismissed(contact.id);
    setMarking(false);
    router.refresh();
    onAdvance();
  }

  return (
    <div className="rounded-[20px] border border-[#ebe9e7] bg-white p-4">
      <div className="flex items-center gap-3">
        <Avatar firstName={contact.first_name} lastName={contact.last_name} size={52} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-serif text-[21px] font-semibold text-neutral-900">{fullName(contact)}</p>
            {mode === "new-registration" && contact.isNew !== undefined && (
              <Badge className={contact.isNew ? "bg-brand-50 text-brand-700" : "bg-neutral-100 text-neutral-600"}>
                {contact.isNew ? "New" : "Returning"}
              </Badge>
            )}
          </div>
          <p className="truncate text-[15px] text-neutral-500">
            {[eventName, contact.lead_source].filter(Boolean).join(" · ") || formatPhone(contact.phone)}
          </p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-neutral-400">
        {contact.dialer_snoozed_at && (
          <span className="flex items-center gap-1 text-amber-600">
            <Clock size={12} /> Tried {formatDistanceToNow(new Date(contact.dialer_snoozed_at), { addSuffix: true })}
          </span>
        )}
        <Link href={`/contacts/${contact.id}`} target="_blank" className="flex items-center gap-1 font-medium text-brand-600">
          <History size={12} /> Full history
        </Link>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {templates.map((t, i) => (
          <button
            key={t.label + i}
            type="button"
            onClick={() => pickTemplate(i)}
            className={cn(
              "h-9 shrink-0 rounded-full border px-3 text-[13px] font-medium",
              activeTemplate === i ? "border-transparent bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-2 rounded-[16px] bg-neutral-50 p-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          className="w-full resize-none bg-transparent text-[15px] text-neutral-800 outline-none"
        />
        <p className="mt-1 text-[12px] text-neutral-400">Sending from your Quo number</p>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={sendAndNext}
          disabled={!contact.phone || sending || !draft.trim()}
          className="h-14 flex-1 rounded-xl bg-brand-600 text-[15px] font-semibold text-white disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send & next"}
        </button>
        <button
          type="button"
          onClick={callInstead}
          disabled={!contact.phone}
          className="h-14 rounded-xl border border-neutral-200 px-4 text-[15px] font-semibold text-neutral-700 disabled:opacity-40"
        >
          <Phone size={17} className="inline" /> Call instead
        </button>
      </div>

      {called && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => outcome("no-answer")}
            disabled={marking}
            className="h-11 flex-1 rounded-full border border-neutral-200 text-[14px] font-medium text-neutral-600 disabled:opacity-50"
          >
            No answer / voicemail
          </button>
          <button
            type="button"
            onClick={() => outcome("connected")}
            disabled={marking}
            className="h-11 flex-1 rounded-full bg-neutral-900 text-[14px] font-medium text-white disabled:opacity-50"
          >
            Connected
          </button>
        </div>
      )}

      <button type="button" onClick={skip} disabled={marking} className="mt-3 flex w-full items-center justify-center gap-1 text-[14px] font-medium text-neutral-400">
        Skip <ChevronRight size={14} />
      </button>
    </div>
  );
}
