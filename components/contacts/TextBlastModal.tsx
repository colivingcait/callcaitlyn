"use client";

import { useEffect, useState } from "react";
import { X, MessageSquareText, Send, Users } from "lucide-react";
import { Button, Textarea, Input } from "@/components/ui";
import { applyMergeFields, PREVIEW_CONTACT } from "@/lib/crm/merge-fields";
import { dayBeforeReminderTemplate, dayOfReminderTemplate, weekBeforeReminderTemplate } from "@/lib/crm/event-text-templates";
import { estimatedTextBlastMinutes } from "@/lib/crm/text-blast-timing";
import {
  createTextBlast,
  cancelTextBlast,
  getTextBlastsForEvent,
  getTextBlastAudiencePreview,
  getEventAccount,
  sendTestText,
  getTextBlastFailureDetails,
  retryFailedTextBlastRecipients,
  listEventOccurrences,
  getEventAttendanceCounts,
  type TextBlastWithProgress,
  type TextBlastFailureGroup,
  type EventOccurrence,
  type EventAttendanceCounts,
  type AttendanceStatus,
} from "@/app/(app)/contacts/text-blast-actions";

const ATTENDANCE_OPTIONS: { value: AttendanceStatus; label: string; countKey: keyof EventAttendanceCounts }[] = [
  { value: "registered", label: "Registered", countKey: "registered" },
  { value: "attended", label: "Attended", countKey: "attended" },
  { value: "no_show", label: "No-show", countKey: "noShow" },
  { value: "walk_in", label: "Walk-in", countKey: "walkIn" },
];

export function TextBlastModal({ eventName, onClose }: { eventName: string; onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: true; recipientCount: number } | { ok: false; error: string } | null>(null);
  const [history, setHistory] = useState<TextBlastWithProgress[] | null>(null);
  const [failureDetails, setFailureDetails] = useState<Record<string, TextBlastFailureGroup[]>>({});
  const [expandedFailures, setExpandedFailures] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  async function toggleFailures(blastId: string) {
    if (expandedFailures === blastId) {
      setExpandedFailures(null);
      return;
    }
    setExpandedFailures(blastId);
    if (!failureDetails[blastId]) {
      const groups = await getTextBlastFailureDetails(blastId);
      setFailureDetails((prev) => ({ ...prev, [blastId]: groups }));
    }
  }

  async function retry(blastId: string) {
    setRetrying(blastId);
    await retryFailedTextBlastRecipients(blastId);
    setRetrying(null);
    setExpandedFailures(null);
    setFailureDetails((prev) => {
      const next = { ...prev };
      delete next[blastId];
      return next;
    });
    await loadHistory();
  }

  const [audience, setAudience] = useState<{ count: number; sample: string[] } | null>(null);
  const [excludeRecent, setExcludeRecent] = useState(false);
  const [excludeDays, setExcludeDays] = useState(1);
  const [eventAccount, setEventAccount] = useState<string | null>(null);

  // "all_registered" is the original behavior - everyone ever registered
  // under this recurring event name, minus an optional recent-signups
  // cutoff. "occurrence" targets one specific night by its Eventbrite
  // event_id, sliced by whether they actually showed up.
  const [audienceMode, setAudienceMode] = useState<"all_registered" | "occurrence">("all_registered");
  const [occurrences, setOccurrences] = useState<EventOccurrence[] | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>("attended");
  const [attendanceCounts, setAttendanceCounts] = useState<EventAttendanceCounts | null>(null);

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
    if (audienceMode === "occurrence" && selectedEventId) {
      getTextBlastAudiencePreview(eventName, undefined, { eventId: selectedEventId, attendanceStatus }).then(setAudience);
      getEventAttendanceCounts(selectedEventId).then(setAttendanceCounts);
    } else if (audienceMode === "all_registered") {
      getTextBlastAudiencePreview(eventName, registeredBeforeCutoff()).then(setAudience);
    }
  }

  useEffect(() => {
    loadHistory();
    getEventAccount(eventName).then(setEventAccount);
    listEventOccurrences(eventName).then((list) => {
      setOccurrences(list);
      setSelectedEventId((current) => current ?? list[0]?.eventId ?? null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventName]);

  useEffect(() => {
    loadAudience();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audienceMode, excludeRecent, excludeDays, selectedEventId, attendanceStatus]);

  async function send() {
    setSending(true);
    const outcome = await createTextBlast(
      eventName,
      message,
      registeredBeforeCutoff(),
      audienceMode === "occurrence" && selectedEventId ? { eventId: selectedEventId, attendanceStatus } : undefined,
    );
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

          <div className="space-y-2">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setAudienceMode("all_registered")}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${audienceMode === "all_registered" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-neutral-200 text-neutral-600"}`}
              >
                Everyone registered
              </button>
              <button
                type="button"
                onClick={() => setAudienceMode("occurrence")}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${audienceMode === "occurrence" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-neutral-200 text-neutral-600"}`}
              >
                One specific date
              </button>
            </div>

            {audienceMode === "all_registered" ? (
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs text-neutral-600">
                  <input
                    type="checkbox"
                    checked={excludeRecent}
                    onChange={(e) => setExcludeRecent(e.target.checked)}
                    className="accent-brand-600"
                  />
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
                  Meetups reuse the same event name every month, so &ldquo;registered for this event&rdquo; can include people who just signed up
                  for a future date - use this to leave them out of a reminder about one that already happened.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  value={selectedEventId ?? ""}
                  onChange={(e) => setSelectedEventId(e.target.value || null)}
                  className="w-full rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs"
                >
                  {!occurrences && <option>Loading dates…</option>}
                  {occurrences?.length === 0 && <option>No occurrences found</option>}
                  {occurrences?.map((o) => (
                    <option key={o.eventId} value={o.eventId}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-1.5">
                  {ATTENDANCE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAttendanceStatus(opt.value)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium ${attendanceStatus === opt.value ? "border-brand-500 bg-brand-50 text-brand-700" : "border-neutral-200 text-neutral-600"}`}
                    >
                      {opt.label}
                      {attendanceCounts && ` (${attendanceCounts[opt.countKey]})`}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-neutral-400">
                  Registered = signed up on Eventbrite. Attended = actually checked in (whether or not they registered). No-show = registered but
                  didn&apos;t check in. Walk-in = checked in without registering.
                </p>
              </div>
            )}
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
                ? `Queued for ${result.recipientCount} recipient${result.recipientCount === 1 ? "" : "s"} - should finish sending in roughly ${estimatedTextBlastMinutes(result.recipientCount)} minutes.`
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
                    {b.attendance_status && (
                      <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500">
                        {ATTENDANCE_OPTIONS.find((o) => o.value === b.attendance_status)?.label}
                      </span>
                    )}
                    {b.status === "sending" && (
                      <button onClick={() => cancel(b.id)} className="font-medium text-red-600 hover:underline">
                        Cancel remaining
                      </button>
                    )}
                  </div>
                  {(b.failed > 0 || b.skipped > 0) && (
                    <p className="mt-1 text-neutral-400">
                      {b.failed > 0 && (
                        <button onClick={() => toggleFailures(b.id)} className="font-medium text-red-600 hover:underline">
                          {b.failed} failed
                        </button>
                      )}
                      {b.failed > 0 && b.skipped > 0 && " · "}
                      {b.skipped > 0 && `${b.skipped} skipped (no phone)`}
                    </p>
                  )}
                  {expandedFailures === b.id && (
                    <div className="mt-2 space-y-2 rounded-lg bg-red-50 p-2">
                      {!failureDetails[b.id] ? (
                        <p className="text-neutral-400">Loading…</p>
                      ) : (
                        <>
                          <div className="space-y-1.5">
                            {failureDetails[b.id].map((group) => (
                              <div key={group.error}>
                                <p className="font-medium text-red-700">
                                  {group.count}× — {group.error}
                                </p>
                                <p className="text-neutral-500">{group.sample.map((s) => s.name || s.phone).join(", ")}</p>
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={() => retry(b.id)}
                            disabled={retrying === b.id}
                            className="font-medium text-red-700 hover:underline disabled:opacity-50"
                          >
                            {retrying === b.id ? "Retrying…" : "Retry failed sends"}
                          </button>
                        </>
                      )}
                    </div>
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
