"use client";

import { useState } from "react";
import { MessageSquareText } from "lucide-react";
import { TextBlastModal } from "@/components/contacts/TextBlastModal";
import { relativeTime } from "@/lib/format-time";
import type { TextBlastWithProgress } from "@/lib/crm/text-blasts";

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Scheduled",
  sending: "Sending",
  sent: "Sent",
  canceled: "Canceled",
  failed: "Failed",
};

export function SendsTab({ eventName, blasts }: { eventName: string; blasts: TextBlastWithProgress[] }) {
  const [composing, setComposing] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setComposing(true)}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white text-sm font-semibold text-neutral-800"
      >
        <MessageSquareText size={15} /> Add a send
      </button>

      <div className="mt-3 space-y-2">
        {blasts.length === 0 ? (
          <p className="rounded-2xl border border-[#ebe9e7] bg-white px-4 py-6 text-center text-[15px] text-neutral-400">
            No texts sent for this event yet.
          </p>
        ) : (
          blasts.map((b) => (
            <div key={b.id} className="rounded-2xl border border-[#ebe9e7] bg-white px-4 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-neutral-900">{STATUS_LABEL[b.status] ?? b.status}</p>
                <p className="text-sm text-neutral-400">{relativeTime(b.created_at)}</p>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-[15px] text-neutral-700">{b.message}</p>
              <p className="mt-1.5 text-sm text-neutral-500">
                {b.sent} of {b.total} sent{b.failed > 0 ? ` · ${b.failed} failed` : ""}
              </p>
            </div>
          ))
        )}
      </div>

      {composing && <TextBlastModal target={{ kind: "event", eventName }} onClose={() => setComposing(false)} />}
    </div>
  );
}
