"use client";

import { useState } from "react";
import Link from "next/link";
import { sendRateMoveMessage, dismissRateMove } from "@/app/(app)/insights/rate-move-actions";
import { formatCurrency } from "@/lib/utils";
import { formatLocal } from "@/lib/format-time";
import { Button, Textarea } from "@/components/ui";
import type { RateMove } from "@/lib/data/rate-moves";

function draftFor(move: RateMove): string {
  const firstName = move.contactName.split(" ")[0] || move.contactName;
  const address = move.propertyAddress || "the property";
  if (move.ceiling) {
    return `${firstName} — rates came down this week. On the same ${formatCurrency(move.originalPayment)} payment we talked about, you'd now be looking at around ${formatCurrency(move.ceiling.newCeiling)} instead of ${formatCurrency(move.ceiling.originalPrice)}. Worth another look?`;
  }
  return `${firstName} — rates came down this week. On the ${address} numbers I ran you, your payment would now be about ${formatCurrency(move.newPayment)} instead of ${formatCurrency(move.originalPayment)} - about ${formatCurrency(move.monthlyDelta)} less a month. Want me to send updated numbers?`;
}

export function RateMoveRow({
  move,
  phone,
  email,
}: {
  move: RateMove;
  phone: string | null;
  email: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(() => draftFor(move));
  const [channel, setChannel] = useState<"text" | "email">(phone ? "text" : "email");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState("");

  async function handleSend() {
    const to = channel === "text" ? phone : email;
    if (!to) return;
    setSending(true);
    setError("");
    const result = await sendRateMoveMessage(move.contactId, channel, to, message);
    setSending(false);
    if (result.ok) setSent(true);
    else setError(result.error ?? "Couldn't send that.");
  }

  async function handleNotHim() {
    await dismissRateMove(move.contactId);
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <div className="border-b border-neutral-100 px-4 py-3.5 last:border-b-0">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/contacts/${move.contactId}`} className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-semibold leading-6 text-neutral-900">{move.contactName}</p>
          <p className="truncate text-[15px] leading-[22px] text-neutral-600">
            {move.propertyAddress || "No address on file"} · you quoted {formatCurrency(move.originalPayment)} on {formatLocal(move.originalQuotedAt, "MMM d")}
            {move.ceiling && ` · said ${formatCurrency(move.ceiling.originalPrice)} was their ceiling`}
          </p>
        </Link>
        <div className="shrink-0 text-right">
          {move.ceiling ? (
            <>
              <p className="text-lg font-semibold text-neutral-900">{formatCurrency(move.ceiling.newCeiling)}</p>
              <p className="text-sm text-neutral-500">new ceiling</p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold text-neutral-900">{formatCurrency(move.newPayment)}</p>
              <p className="text-sm text-neutral-500">{formatCurrency(move.monthlyDelta)} less</p>
            </>
          )}
        </div>
      </div>

      {sent ? (
        <p className="mt-2 text-sm font-medium text-neutral-500">Sent.</p>
      ) : (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setOpen((v) => !v)}>
            {open ? "Hide draft" : "See draft"}
          </Button>
          <button type="button" onClick={handleNotHim} className="text-sm text-neutral-400">
            Not him
          </button>
        </div>
      )}

      {open && !sent && (
        <div className="mt-3 rounded-xl border border-neutral-200 bg-[#fcfbfa] p-3.5">
          {phone && email && (
            <div className="mb-2 flex gap-2">
              <button
                type="button"
                onClick={() => setChannel("text")}
                className={`rounded-full border px-3 py-1 text-sm font-medium ${channel === "text" ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-700"}`}
              >
                Text
              </button>
              <button
                type="button"
                onClick={() => setChannel("email")}
                className={`rounded-full border px-3 py-1 text-sm font-medium ${channel === "email" ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-700"}`}
              >
                Email
              </button>
            </div>
          )}
          <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
          {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
          <div className="mt-2.5">
            <Button size="sm" onClick={handleSend} disabled={sending || !message.trim()}>
              {sending ? "Sending…" : "Send"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
