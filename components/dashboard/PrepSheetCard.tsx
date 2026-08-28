"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clearPinnedItem } from "@/app/(app)/today-actions";
import type { PrepSheetPayload } from "@/lib/data/prep-sheet";

export function PrepSheetCard({ id, payload }: { id: string; payload: PrepSheetPayload }) {
  const router = useRouter();
  const [clearing, setClearing] = useState(false);
  const time = new Date(payload.startAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  async function handleClear() {
    setClearing(true);
    await clearPinnedItem(id);
    router.refresh();
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#ebe9e7] bg-white">
      <div className="flex items-center gap-2.5 bg-[#1c1917] px-[18px] py-4">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-[#eea095]">Notification · 30 minutes out</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {payload.eventTitle} with {payload.contactName} at {time}
            {payload.location ? ` — ${payload.location}` : ""}
          </p>
        </div>
        <button type="button" onClick={handleClear} disabled={clearing} className="shrink-0 text-sm font-medium text-neutral-300 disabled:opacity-50">
          {clearing ? "Clearing…" : "Clear"}
        </button>
      </div>

      <div className="space-y-4 p-[18px]">
        {payload.sinceLastSpoke && (
          <div className="rounded-xl bg-[#fcfbfa] p-3.5">
            <p className="text-sm font-semibold text-neutral-500">Since you last spoke</p>
            <p className="mt-1 text-[15px] leading-6 text-neutral-700">{payload.sinceLastSpoke}</p>
          </div>
        )}

        {payload.whatTheyreAfter.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-neutral-500">What they&apos;re after</p>
            <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-[15px] text-neutral-700">
              {payload.whatTheyreAfter.map((r) => (
                <p key={r.label}>
                  <span className="text-neutral-500">{r.label}:</span> {r.value}
                </p>
              ))}
            </div>
          </div>
        )}

        {payload.notes && (
          <div>
            <p className="text-sm font-semibold text-neutral-500">Notes on file</p>
            <p className="mt-1 text-[15px] leading-6 text-neutral-700">{payload.notes}</p>
          </div>
        )}

        {payload.recentActivity.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-neutral-500">Everything, in order</p>
            <div className="mt-1.5 space-y-1">
              {payload.recentActivity.map((a, i) => (
                <p key={i} className="text-[15px] text-neutral-700">
                  <span className="text-neutral-400">{new Date(a.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span> — {a.label}
                </p>
              ))}
            </div>
          </div>
        )}

        <Link href={`/contacts/${payload.contactId}`} className="inline-block text-sm font-semibold text-brand-700">
          Open full record
        </Link>
      </div>
    </div>
  );
}
