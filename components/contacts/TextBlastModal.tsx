"use client";

import { useEffect, useState } from "react";
import { X, MessageSquareText, Send, Users } from "lucide-react";
import { Button, Textarea, Input } from "@/components/ui";
import { applyMergeFields, PREVIEW_CONTACT } from "@/lib/crm/merge-fields";
import { dayBeforeReminderTemplate, dayOfReminderTemplate, weekBeforeReminderTemplate } from "@/lib/crm/event-text-templates";
import {
  createTextBlast,
  cancelTextBlast,
  getTextBlastsForEvent,
  getTextBlastAudiencePreview,
  getEventAccount,
  sendTestText,
  type TextBlastWithProgress,
} from "@/app/(app)/contacts/text-blast-actions";

// 8 sends per ~15-minute cron tick (see lib/crm/text-blasts.ts) - used only
// to give a rough "done by around..." estimate, not an exact promise.
const SENDS_PER_RUN = 8;
const RUN_INTERVAL_MINUTES = 15;

function estimatedMinutes(recipientCount: number) {
  return Math.ceil(recipientCount / SENDS_PER_RUN) * RUN_INTERVAL_MINUTES;
}

export function TextBlastModal({ eventName, onClose }: { eventName: string; onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: true; recipientCount: number } | { ok: false; error: string } | null>(null);
  const [history, setHistory] = useState<TextBlastWithProgress[] | null>(null);

  const [audience, setAudience] = useState<{ count: number; sample: string[] } | null>(null);
  const [excludeRecent, setExcludeRecent] = useState(false);
  const [excludeDays, setExcludeDays] = useState(1);
  const [eventAccount, setEventAccount] = useState<string | null>(null);

  const [testPhone, setTestPhone] = useState(() => (typeof window !== "undefined" ? (localStorage.getItem("textBlastTestPhone") ?? "") : ""));
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: true } | { ok: false; error: string } | null>(null);

  function registeredBeforeCutoff(): string | undefined {
    if (!excludeRecent || !excludeDays || excludeDays <= 0) return undefined;
    return new Date(Date.now() - excludeDays * 24 * 60 * 60 * 1000).toISOString();
  }

  async function loadHistory() {
    const blasts = await getTextBlastsForEvent(eventName);
    setHistory(blasts);
  }

  function loadAudience() {
    getTextBlastAudiencePreview(eventName, registeredBeforeCutoff()).then(setAudience);
  }

  useEffect(() => {
    loadHistory();
    loadAudience();
    getEventAccount(eventName).then(setEventAccount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventName, excludeRecent, excludeDays]);

  async function send() {
    setSending(true);
    const outcome = await createTextBlast(eventName, message, registeredBeforeCutoff());
    setSending(false);
    if (outcome.ok) {
      setResult({ ok: true, recipientCount: outcome.recipientCount });
      setMessage("");
      loadHistory();
    } else {
      setResult({ ok: false, error: outcome.error });
    }
  }

  async function sendTest() {
    localStorage.setItem("textBlastTestPhone", testPhone);
    setTestSending(true);
    setTestResult(null);
    const outcome = await sendTestText(message, testPhone);
    setTestSending(false);
    setTestResult(outcome.ok ? { ok: true } : { ok: false, error: outcome.error });
  }

  async function cancel(blastId: string) {
    await cancelTextBlast(blastId);
    loadHistory();
  }

  const preview = message.trim() ? applyMergeFields(message, PREVIEW_CONTACT) : "";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4">
          <div>
            <p className="font-serif text-xl font-semibold text-neutral-900">Text reminder</p>
            <p className="mt-0.5 text-xs text-neutral-500">{eventName}</p>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {audience && (
            <div className="flex items-start gap-2 rounded-xl bg-neutral-50 px-3.5 py-2.5 text-xs text-neutral-600">
              <Users size={14} className="mt-0.5 shrink-0 text-neutral-400" />
              {audience.count === 0 ? (
                <span>No registrants with a phone number on file for this event.</span>
              ) : (
                <span>
                  Sending to <span className="font-semibold text-neutral-900">{audience.count}</span> {audience.count === 1 ? "person" : "people"}
                  {audience.sample.length > 0 && (
                    <>
                      : {audience.sample.join(", ")}
                      {audience.count > audience.sample.length && ` +${audience.count - audience.sample.length} more`}
                    </>
                  )}
                </span>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs text-neutral-600">
              <input type="checkbox" checked={excludeRecent} onChange={(e) => setExcludeRecent(e.target.checked)} className="accent-brand-600" />
              Exclude anyone who registered in the last
              <input
                type="number"
                min={1}
                value={excludeDays}
                onChange={(e) => setExcludeDays(Math.max(1, Number(e.target.value) || 1))}
                disabled={!excludeRecent}
                className="w-12 rounded-lg border border-neutral-200 px-1.5 py-1 text-center disabled:opacity-50"
              />
              day{excludeDays === 1 ? "" : "s"}
            </label>
            <p className="text-[11px] text-neutral-400">
              Meetups reuse the same event name every month, so &ldquo;registered for this event&rdquo; can include people who just signed up for
              a future date - use this to leave them out of a reminder about one that already happened.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => setMessage(weekBeforeReminderTemplate(eventAccount, eventName))}>
                Week-before template
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setMessage(dayBeforeReminderTemplate(eventAccount, eventName))}>
                Day-before template
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setMessage(dayOfReminderTemplate(eventAccount, eventName))}>
                Day-of template
              </Button>
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hey {{first_name}}, quick reminder about tomorrow's meetup..."
              rows={4}
            />
            <p className="text-xs text-neutral-400">
              Use <code className="rounded bg-neutral-100 px-1 py-0.5">{"{{first_name}}"}</code> to personalize. Sent gradually over time rather
              than all at once - see below for an estimate.
            </p>
          </div>

          {preview && (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Preview (sample name)</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">{preview}</p>
            </div>
          )}

          <div className="space-y-2 border-t border-neutral-100 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Send yourself a test</p>
            <div className="flex gap-2">
              <Input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="Your phone number"
                className="flex-1"
              />
              <Button variant="secondary" onClick={sendTest} disabled={testSending || !message.trim() || !testPhone.trim()} className="shrink-0">
                <Send size={14} /> {testSending ? "Sending…" : "Test"}
              </Button>
            </div>
            {testResult && (
              <p className={testResult.ok ? "text-xs text-brand-700" : "text-xs text-red-600"}>
                {testResult.ok ? "Test sent - check your phone." : testResult.error}
              </p>
            )}
          </div>

          {result && (
            <p className={result.ok ? "text-sm text-brand-700" : "text-sm text-red-600"}>
              {result.ok
                ? `Queued for ${result.recipientCount} recipient${result.recipientCount === 1 ? "" : "s"} - should finish sending in roughly ${estimatedMinutes(result.recipientCount)} minutes.`
                : result.error}
            </p>
          )}

          <Button onClick={send} disabled={sending || !message.trim() || !audience?.count} className="w-full">
            <MessageSquareText size={15} /> {sending ? "Queuing…" : "Send staggered reminder"}
          </Button>

          {history && history.length > 0 && (
            <div className="space-y-2 border-t border-neutral-100 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Previous sends for this event</p>
              {history.map((b) => (
                <div key={b.id} className="rounded-xl border border-neutral-200 p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-neutral-700">
                      {b.status === "sending" && `Sending: ${b.sent}/${b.total} sent`}
                      {b.status === "completed" && `Completed: ${b.sent}/${b.total} sent`}
                      {b.status === "canceled" && `Canceled: ${b.sent}/${b.total} sent`}
                    </span>
                    {b.status === "sending" && (
                      <button onClick={() => cancel(b.id)} className="font-medium text-red-600 hover:underline">
                        Cancel remaining
                      </button>
                    )}
                  </div>
                  {(b.failed > 0 || b.skipped > 0) && (
                    <p className="mt-1 text-neutral-400">
                      {b.failed > 0 && `${b.failed} failed`}
                      {b.failed > 0 && b.skipped > 0 && " · "}
                      {b.skipped > 0 && `${b.skipped} skipped (no phone)`}
                    </p>
                  )}
                  <p className="mt-1 max-w-full truncate text-neutral-400">&ldquo;{b.message}&rdquo;</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
