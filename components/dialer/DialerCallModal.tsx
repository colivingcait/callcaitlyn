"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { openQuoCall } from "@/lib/quo/call-link";
import {
  markDialerConnected,
  markDialerSnoozed,
  markDialerDismissed,
  markEventFollowupConnected,
  markEventFollowupSnoozed,
  markEventFollowupDismissed,
  saveDialerNotes,
} from "@/app/(app)/dialer/actions";
import { sendTextToContact } from "@/app/(app)/contacts/actions";
import { newRegistrationTemplate, returningRegistrationTemplate } from "@/lib/crm/event-text-templates";
import { applyMergeFields } from "@/lib/crm/merge-fields";
import { Button, Select, Textarea, Badge } from "@/components/ui";
import { formatDistanceToNow } from "date-fns";
import { X, PhoneCall, MessageSquareText, History, Clock } from "lucide-react";
import { fullName, formatPhone } from "@/lib/utils";
import type { PipelineStage, TextTemplate } from "@/types/database";
import type { DialerContact, DialerMode } from "@/lib/data/dialer";

export function DialerCallModal({
  contact,
  stages,
  mode,
  defaultDraftTemplate,
  onClose,
}: {
  contact: DialerContact;
  stages: PipelineStage[];
  mode: DialerMode;
  defaultDraftTemplate?: TextTemplate | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [stageId, setStageId] = useState(contact.stage_id ?? "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [marking, setMarking] = useState(false);
  const [called, setCalled] = useState(false);

  const [texting, setTexting] = useState(false);
  const [textBody, setTextBody] = useState("");
  const [textSending, setTextSending] = useState(false);
  const [textResult, setTextResult] = useState<{ ok: true } | { ok: false; error: string } | null>(null);

  function callNow() {
    if (!contact.phone) return;
    setCalled(true);
    openQuoCall(contact.phone);
  }

  async function handleOutcome(outcome: "connected" | "no-answer") {
    setMarking(true);
    if (mode === "event-followup") {
      if (outcome === "connected") await markEventFollowupConnected(contact.id);
      else await markEventFollowupSnoozed(contact.id);
    } else {
      if (outcome === "connected") await markDialerConnected(contact.id);
      else await markDialerSnoozed(contact.id);
    }
    setMarking(false);
    router.refresh();
    onClose();
  }

  async function handleDismiss() {
    setMarking(true);
    if (mode === "event-followup") await markEventFollowupDismissed(contact.id);
    else await markDialerDismissed(contact.id);
    setMarking(false);
    router.refresh();
    onClose();
  }

  async function handleSave() {
    setSaving(true);
    await saveDialerNotes(contact.id, stageId || null, note);
    setSaving(false);
    router.refresh();
    onClose();
  }

  function openTexting(template: string) {
    setTextBody(template);
    setTexting(true);
    setTextResult(null);
  }

  async function sendText() {
    if (!contact.phone || !textBody.trim()) return;
    setTextSending(true);
    const result = await sendTextToContact(contact.id, contact.phone, textBody.trim());
    setTextSending(false);
    if (result.ok) {
      setTextResult({ ok: true });
      setTextBody("");
      router.refresh();
    } else {
      setTextResult({ ok: false, error: result.error });
    }
  }

  const eventName = mode === "new-registration" ? contact.registrationLabel : contact.last_event_name;
  const eventAccount = mode === "new-registration" ? contact.registrationAccount : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="flex max-h-[90vh] w-full max-w-sm flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-serif text-xl font-semibold text-neutral-900">{fullName(contact)}</p>
                {mode === "new-registration" && contact.isNew !== undefined && (
                  <Badge className={contact.isNew ? "bg-brand-50 text-brand-700" : "bg-neutral-100 text-neutral-600"}>
                    {contact.isNew ? "New" : "Returning"}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-neutral-500">{formatPhone(contact.phone)}</p>
            </div>
            <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100">
              <X size={18} />
            </button>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-400">
            <span>{[contact.lead_source, contact.last_event_name].filter(Boolean).join(" · ") || "No lead source on file"}</span>
            {contact.dialer_snoozed_at && (
              <span className="inline-flex items-center gap-0.5 text-amber-600">
                <Clock size={10} /> Tried {formatDistanceToNow(new Date(contact.dialer_snoozed_at), { addSuffix: true })}
              </span>
            )}
            <Link href={`/contacts/${contact.id}`} target="_blank" className="inline-flex items-center gap-1 font-medium text-brand-600">
              <History size={11} /> View full history
            </Link>
          </div>

          <button
            onClick={callNow}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3.5 text-base font-semibold text-white hover:bg-red-700 active:scale-[0.98]"
          >
            <PhoneCall size={18} /> Call {contact.first_name} now
          </button>

          {called && (
            <div className="mt-3">
              <p className="mb-1.5 text-center text-xs text-neutral-400">How&apos;d it go?</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => handleOutcome("no-answer")} disabled={marking} className="flex-1">
                  No answer / voicemail
                </Button>
                <Button size="sm" onClick={() => handleOutcome("connected")} disabled={marking} className="flex-1">
                  Connected
                </Button>
              </div>
            </div>
          )}

          <div className="mt-4 space-y-2 border-t border-neutral-100 pt-4">
            <p className="text-xs font-medium text-neutral-500">Send a text</p>
            {!texting ? (
              <div className="flex flex-wrap gap-2">
                {mode === "new-registration" && contact.isNew !== false && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openTexting(newRegistrationTemplate(contact.first_name, eventAccount, eventName))}
                  >
                    <MessageSquareText size={13} /> Welcome / intro
                  </Button>
                )}
                {mode === "new-registration" && contact.isNew !== true && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openTexting(returningRegistrationTemplate(contact.first_name, eventAccount, eventName))}
                  >
                    <MessageSquareText size={13} /> Welcome back
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openTexting(defaultDraftTemplate ? applyMergeFields(defaultDraftTemplate.body, contact) : "")}
                >
                  <MessageSquareText size={13} /> {defaultDraftTemplate?.label ?? "Blank text"}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Textarea rows={4} value={textBody} onChange={(e) => setTextBody(e.target.value)} placeholder="Write a text..." />
                {textResult && (
                  <p className={textResult.ok ? "text-xs text-brand-700" : "text-xs text-red-600"}>
                    {textResult.ok ? "Sent." : textResult.error}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setTexting(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button size="sm" onClick={sendText} disabled={textSending || !textBody.trim()} className="flex-1">
                    {textSending ? "Sending…" : "Send"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 space-y-3 border-t border-neutral-100 pt-4">
            <p className="text-xs font-medium text-neutral-500">Reclassify / add notes</p>
            <Select value={stageId} onChange={(e) => setStageId(e.target.value)}>
              <option value="">Leave stage as-is</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Textarea
              rows={3}
              placeholder="What did they say? What's got them interested?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <Button onClick={handleSave} disabled={saving} variant="secondary" className="w-full">
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>

          <div className="mt-4 border-t border-neutral-100 pt-4">
            <button
              onClick={handleDismiss}
              disabled={marking}
              className="w-full rounded-xl border border-neutral-200 py-2.5 text-center text-sm font-medium text-neutral-500 hover:bg-neutral-50 disabled:opacity-50"
            >
              {marking
                ? "Dismissing…"
                : mode === "event-followup"
                  ? "Dismiss — no follow-up needed"
                  : "Dismiss — no action needed this time"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
