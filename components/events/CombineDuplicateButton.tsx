"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mergeEventInto } from "@/app/(app)/events/actions";

type DupEvent = { eventId: string; label: string; date: string };

// The pair the portal index flagged - always merges the smaller listing
// into the larger one (more real registrants stay put, fewer to re-verify).
export function CombineDuplicateButton({ events }: { events: DupEvent[] }) {
  const router = useRouter();
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function combine() {
    if (events.length < 2) return;
    setMerging(true);
    setError(null);
    const [target, ...sources] = [...events];
    let result: { ok: true } | { ok: false; error: string } = { ok: true };
    for (const source of sources) {
      result = await mergeEventInto(source.eventId, target.eventId);
      if (!result.ok) break;
    }
    setMerging(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="shrink-0 text-right">
      <button
        type="button"
        onClick={combine}
        disabled={merging}
        className="rounded-[10px] border border-neutral-200 bg-white px-3.5 py-2 text-sm font-semibold text-neutral-800 disabled:opacity-50"
      >
        {merging ? "Combining…" : "Combine them"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
