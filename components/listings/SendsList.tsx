"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelListingSend } from "@/app/(app)/listings/actions";
import { relativeTime } from "@/lib/format-time";
import type { ListingSend } from "@/types/database";

type Progress = { total: number; sent: number; failed: number; skipped: number; pending: number };

const STATE_COLORS: Record<string, { bg: string; text: string }> = {
  sending: { bg: "#fef3c7", text: "#b45309" },
  completed: { bg: "#f5f5f4", text: "#57534e" },
  canceled: { bg: "#fee2e2", text: "#b91c1c" },
};

export function SendsList({ listingId, sends, progress }: { listingId: string; sends: ListingSend[]; progress: Record<string, Progress> }) {
  const router = useRouter();
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const sentCount = sends.filter((s) => s.status === "completed").length;
  const schedulingCount = sends.filter((s) => s.status === "sending").length;

  async function handleCancel(id: string) {
    setCancelingId(id);
    await cancelListingSend(id, listingId);
    setCancelingId(null);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-[#ebe9e7] bg-white">
      <div className="px-[18px] py-4">
        <h2 className="text-base font-semibold text-neutral-900">This listing&apos;s sends</h2>
        <p className="mt-0.5 text-sm text-neutral-500">
          {sentCount} sent{schedulingCount > 0 ? ` · ${schedulingCount} in progress` : ""}
        </p>
      </div>
      {sends.length === 0 ? (
        <p className="border-t border-neutral-100 px-[18px] py-6 text-[15px] text-neutral-400">Nothing sent yet.</p>
      ) : (
        <div className="border-t border-neutral-100">
          {sends.map((s) => {
            const p = progress[s.id] ?? { total: 0, sent: 0, failed: 0, skipped: 0, pending: 0 };
            const colors = STATE_COLORS[s.status] ?? STATE_COLORS.completed;
            return (
              <div key={s.id} className="flex items-center gap-3.5 border-b border-neutral-100 px-[18px] py-3.5 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-neutral-900">
                    {s.channel === "email" ? "Email" : "Text"} · {relativeTime(s.created_at)}
                  </p>
                  <p className="truncate text-sm text-neutral-500">
                    {s.subject || s.message} · {p.sent} of {p.total} sent{p.failed > 0 ? ` · ${p.failed} failed` : ""}
                  </p>
                </div>
                <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: colors.bg, color: colors.text }}>
                  {s.status === "sending" ? "Sending" : s.status === "canceled" ? "Canceled" : "Sent"}
                </span>
                {s.status === "sending" && (
                  <button
                    type="button"
                    onClick={() => handleCancel(s.id)}
                    disabled={cancelingId === s.id}
                    className="shrink-0 rounded-[10px] border border-neutral-200 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-700 disabled:opacity-50"
                  >
                    {cancelingId === s.id ? "Canceling…" : "Cancel"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      <p className="border-t border-neutral-100 px-[18px] py-2.5 text-sm text-neutral-400">
        These sends never appear in Campaigns — that list stays your leads.
      </p>
    </div>
  );
}
