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
  markConfirmationConnected,
  markConfirmationSnoozed,
  markConfirmationDismissed,
  saveDialerNotes,
} from "@/app/(app)/dialer/actions";
import { sendTextToContact } from "@/app/(app)/contacts/actions";
import { newRegistrationTemplate, returningRegistrationTemplate, MESSAGE_TEMPLATE_CATEGORIES } from "@/lib/crm/event-text-templates";
import { applyMergeFields } from "@/lib/crm/merge-fields";
import { RecentTextsPanel } from "@/components/dialer/RecentTextsPanel";
import { Button, Select, Textarea, Badge } from "@/components/ui";
import { formatDistanceToNow } from "date-fns";
import { X, PhoneCall, MessageSquareText, History, Clock } from "lucide-react";
import { fullName, formatPhone } from "@/lib/utils";
import type { PipelineStage, TextTemplate } from "@/types/database";
import type { DialerContact, DialerMode } from "@/lib/data/dialer";

const PRE_EVENT_TEMPLATES = MESSAGE_TEMPLATE_CATEGORIES.find((c) => c.key === "pre_event")!.options;
const FOLLOW_UP_TEMPLATES = MESSAGE_TEMPLATE_CATEGORIES.find((c) => c.key === "follow_up")!.options;

// Calendar-day difference, not a raw hour count - an event at 6:30pm
// today is still "today" at 9am, even though that's only ~9 hours away
// and far more than a naive "<=6 hours" cutoff would call "day of."
function daysBetweenCalendarDates(from: Date, to: Date): number {
  const startOf = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((startOf(to) - startOf(from)) / (24 * 60 * 60 * 1000));
}

// Which pre-event template reads naturally given how close the event
// actually is - the confirmation queue only ever spans a ~2-day lookahead
// (see listConfirmationQueue) plus a small past-side grace window, so this
// realistically only ever picks "Day before" or "Day of," but stays
// correct if that window ever changes.
function defaultPreEventIndex(eventStart: string): number {
  const daysUntil = daysBetweenCalendarDates(new Date(), new Date(eventStart));
  if (daysUntil <= 0) return 3; // Day of - today, or already started
  if (daysUntil === 1) return 2; // Day before
  if (daysUntil <= 4) return 1; // Few days before
  return 0; // Week before
}

export function DialerCallModal({
  contact,
  stages,
  mode,
  defaultDraftTemplate,
  onClose,
  onAdvance,
}: {
  contact: DialerContact;
  stages: PipelineStage[];
  mode: DialerMode;
  defaultDraftTemplate?: TextTemplate | null;
  onClose: () => void;
  // Optional "send & next" hook - the parent list advances to the next
  // contact after a successful text instead of leaving this card up, same
  // as the mobile PersonCard's Send & next already does. Left unset by
  // ConfirmationQueue, whose modal is opened per-row rather than swapped
  // through a queue, so that flow is unchanged.
  onAdvance?: () => void;
}) {
  const router = useRouter();
  const eventName = mode === "new-registration" || mode === "confirmation" ? contact.registrationLabel : contact.last_event_name;
  const eventAccount = mode === "new-registration" || mode === "confirmation" ? contact.registrationAccount : null;
  // confirmationEventId/confirmationEventStart/confirmationSource are only
  // set (and only meaningful) in "confirmation" mode - see
  // confirmationItemToDialerContact. The confirmation queue is keyed by
  // (event, contact), not just contact, so mark-connected/snoozed/dismissed
  // need to know which occurrence this card is for, and eventStart picks a
  // sensible default pre-event template.
  const eventId = contact.confirmationEventId;
  const eventStart = contact.confirmationEventStart;
  const source = contact.confirmationSource;
  const [stageId, setStageId] = useState(contact.stage_id ?? "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [marking, setMarking] = useState(false);
  const [called, setCalled] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [recentTextsOpen, setRecentTextsOpen] = useState(false);

  // Same "here's a ready-to-send draft, edit if needed" flow across all
  // three queues now, not just confirmation - each mode below picks its
  // own sensible starting draft.
  const [texting, setTexting] = useState(true);
  const [textBody, setTextBody] = useState(() => {
    if (mode === "confirmation" && eventStart) {
      return applyMergeFields(PRE_EVENT_TEMPLATES[defaultPreEventIndex(eventStart)]?.build(eventAccount, eventName) ?? "", contact);
    }
    if (mode === "new-registration") {
      return contact.isNew === false
        ? returningRegistrationTemplate(contact.first_name, eventAccount, eventName)
        : newRegistrationTemplate(contact.first_name, eventAccount, eventName);
    }
    if (mode === "event-followup") {
      return applyMergeFields(FOLLOW_UP_TEMPLATES[0].build(eventAccount, eventName), contact);
    }
    return "";
  });
  // The switchable quick-pick chips shown while texting, if this mode has
  // more than one meaningfully different angle to choose from - confirmation
  // (week/few days/day before/day of) and follow-up (takeaway/where they're
  // at/topic ideas/offer to help). New-registration only ever has one
  // correct default (welcome vs. welcome back, from isNew), so it has
  // nothing to switch between.
  const templateChips = mode === "confirmation" ? PRE_EVENT_TEMPLATES : mode === "event-followup" ? FOLLOW_UP_TEMPLATES : null;
  const [textSending, setTextSending] = useState(false);
  const [textResult, setTextResult] = useState<{ ok: true } | { ok: false; error: string } | null>(null);

  function callNow() {
    if (!contact.phone) return;
    setCalled(true);
    openQuoCall(contact.phone);
  }

  async function handleOutcome(outcome: "connected" | "no-answer") {
    setMarking(true);
    setActionError(null);
    const result =
      mode === "event-followup"
        ? outcome === "connected"
          ? await markEventFollowupConnected(contact.id)
          : await markEventFollowupSnoozed(contact.id)
        : mode === "confirmation"
          ? outcome === "connected"
            ? await markConfirmationConnected(contact.id, eventId!, eventName ?? "")
            : await markConfirmationSnoozed(contact.id, eventId!, eventName ?? "")
          : outcome === "connected"
            ? await markDialerConnected(contact.id)
            : await markDialerSnoozed(contact.id);
    setMarking(false);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    router.refresh();
    onClose();
  }

  async function handleDismiss() {
    setMarking(true);
    setActionError(null);
    const result =
      mode === "event-followup"
        ? await markEventFollowupDismissed(contact.id)
        : mode === "confirmation"
          ? await markConfirmationDismissed(contact.id, eventId!, eventName ?? "")
          : await markDialerDismissed(contact.id);
    setMarking(false);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    router.refresh();
    onClose();
  }

  async function handleSave() {
    setSaving(true);
    setActionError(null);
    const result = await saveDialerNotes(contact.id, stageId || null, note);
    setSaving(false);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
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
    const result = await sendTextToContact(contact.id, contact.phone, applyMergeFields(textBody, contact).trim());
    setTextSending(false);
    if (result.ok) {
      setTextResult({ ok: true });
      setTextBody("");
      // A text counts as having reached this contact for this queue, same
      // as PersonCard's mobile "Send & next" already treats it - without
      // this, texting everyone on a list (rather than calling) never
      // clears anyone off it, since only handleOutcome/handleDismiss did.
      const markResult =
        mode === "event-followup"
          ? await markEventFollowupConnected(contact.id)
          : mode === "confirmation"
            ? await markConfirmationConnected(contact.id, eventId!, eventName ?? "")
            : await markDialerConnected(contact.id);
      if (!markResult.ok) {
        setActionError(markResult.error);
        return;
      }
      router.refresh();
      onAdvance?.();
    } else {
      setTextResult({ ok: false, error: result.error });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
      <div className="flex max-h-[90vh] w-full max-w-sm flex-col">
        <div className="flex-1 overflow-y-auto p-5">
          {actionError && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">Couldn&apos;t save: {actionError}</p>}
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
            {mode === "confirmation" ? (
              <span>
                {eventName}
                {eventStart && ` · ${new Date(eventStart).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`}
                {source === "manual" && " · added by you"}
              </span>
            ) : (
              <span>{[contact.lead_source, contact.last_event_name].filter(Boolean).join(" · ") || "No lead source on file"}</span>
            )}
            {contact.dialer_snoozed_at && (
              <span className="inline-flex items-center gap-0.5 text-amber-600">
                <Clock size={10} /> Tried {formatDistanceToNow(new Date(contact.dialer_snoozed_at), { addSuffix: true })}
              </span>
            )}
            <Link href={`/contacts/${contact.id}`} target="_blank" className="inline-flex items-center gap-1 font-medium text-brand-600">
              <History size={11} /> View full history
            </Link>
          </div>

          {/* Same recent-texts thread as the sidebar below, just inline and
              collapsed by default - the sidebar only shows on md+ screens,
              so this is what covers phones. */}
          <div className="mt-2 md:hidden">
            <button type="button" onClick={() => setRecentTextsOpen((v) => !v)} className="text-xs font-semibold text-brand-600">
              {recentTextsOpen ? "Hide recent texts" : "Show recent texts"}
            </button>
            {recentTextsOpen && (
              <div className="mt-2 rounded-xl border border-neutral-100 bg-[#fcfbfa] p-2.5">
                <RecentTextsPanel contactId={contact.id} />
              </div>
            )}
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
                {templateChips &&
                  templateChips.map((t) => (
                    <Button key={t.label} variant="secondary" size="sm" onClick={() => openTexting(applyMergeFields(t.build(eventAccount, eventName), contact))}>
                      <MessageSquareText size={13} /> {t.label}
                    </Button>
                  ))}
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
                {templateChips && (
                  <div className="flex flex-wrap gap-1.5">
                    {templateChips.map((t) => (
                      <button
                        key={t.label}
                        type="button"
                        onClick={() => setTextBody(applyMergeFields(t.build(eventAccount, eventName), contact))}
                        className="rounded-full border border-neutral-200 px-2.5 py-1 text-[11px] font-medium text-neutral-500 hover:border-brand-300 hover:text-brand-700"
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
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
                  : mode === "confirmation"
                    ? "Dismiss — no need to confirm this one"
                    : "Dismiss — no action needed this time"}
            </button>
          </div>
        </div>
      </div>

      <div className="hidden w-64 shrink-0 flex-col border-l border-neutral-100 bg-[#fcfbfa] md:flex">
        <div className="border-b border-neutral-100 px-4 py-3.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Recent texts</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <RecentTextsPanel contactId={contact.id} />
        </div>
      </div>
      </div>
    </div>
  );
}
