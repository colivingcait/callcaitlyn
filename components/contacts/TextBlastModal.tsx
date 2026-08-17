"use client";

import { useEffect, useState } from "react";
import { X, MessageSquareText } from "lucide-react";
import { Button, Textarea } from "@/components/ui";
import { createTextBlast, cancelTextBlast, getTextBlastsForEvent, type TextBlastWithProgress } from "@/app/(app)/contacts/text-blast-actions";

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

  async function loadHistory() {
    const blasts = await getTextBlastsForEvent(eventName);
    setHistory(blasts);
  }

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventName]);

  async function send() {
    setSending(true);
    const outcome = await createTextBlast(eventName, message);
    setSending(false);
    if (outcome.ok) {
      setResult({ ok: true, recipientCount: outcome.recipientCount });
      setMessage("");
      loadHistory();
    } else {
      setResult({ ok: false, error: outcome.error });
    }
  }

  async function cancel(blastId: string) {
    await cancelTextBlast(blastId);
    loadHistory();
  }

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
          <div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hey {{first_name}}, quick reminder about tomorrow's meetup..."
              rows={4}
            />
            <p className="mt-1.5 text-xs text-neutral-400">
              Use <code className="rounded bg-neutral-100 px-1 py-0.5">{"{{first_name}}"}</code> to personalize. Goes to everyone registered for
              this event with a phone number on file, sent gradually over time rather than all at once - see below for an estimate.
            </p>
          </div>

          {result && (
            <p className={result.ok ? "text-sm text-brand-700" : "text-sm text-red-600"}>
              {result.ok
                ? `Queued for ${result.recipientCount} recipient${result.recipientCount === 1 ? "" : "s"} - should finish sending in roughly ${estimatedMinutes(result.recipientCount)} minutes.`
                : result.error}
            </p>
          )}

          <Button onClick={send} disabled={sending || !message.trim()} className="w-full">
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
