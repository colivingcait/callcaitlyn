"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Button, Select, Textarea, Badge } from "@/components/ui";
import { formatDistanceToNow } from "date-fns";
import { X, PhoneCall, Clock } from "lucide-react";
import { fullName, formatPhone } from "@/lib/utils";
import type { PipelineStage } from "@/types/database";
import type { DialerContact, DialerMode } from "@/lib/data/dialer";

export function DialerCallModal({
  contact,
  stages,
  mode,
  onClose,
}: {
  contact: DialerContact;
  stages: PipelineStage[];
  mode: DialerMode;
  onClose: () => void;
}) {
  const router = useRouter();
  const [stageId, setStageId] = useState(contact.stage_id ?? "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [marking, setMarking] = useState(false);
  const [called, setCalled] = useState(false);

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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
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

        <p className="mt-1.5 text-xs text-neutral-400">
          {[contact.lead_source, contact.last_event_name].filter(Boolean).join(" · ") || "No lead source on file"}
          {contact.dialer_snoozed_at && (
            <span className="ml-2 inline-flex items-center gap-0.5 text-amber-600">
              <Clock size={10} /> Tried {formatDistanceToNow(new Date(contact.dialer_snoozed_at), { addSuffix: true })}
            </span>
          )}
        </p>

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

        <div className="mt-5 space-y-3 border-t border-neutral-100 pt-4">
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

        <div className="mt-5 border-t border-neutral-100 pt-4">
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
  );
}
