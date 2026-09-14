"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { cancelScheduledStep } from "@/app/(app)/sequences/actions";
import { formatLocal } from "@/lib/format-time";
import type { UpcomingBroadcastStep } from "@/lib/data/sequences";

export function UpcomingBroadcastPanel({ steps }: { steps: UpcomingBroadcastStep[] }) {
  const router = useRouter();
  const [canceling, setCanceling] = useState<string | null>(null);

  if (steps.length === 0) {
    return <Card className="text-sm text-neutral-500">No upcoming sends scheduled.</Card>;
  }

  async function cancel(stepId: string) {
    setCanceling(stepId);
    await cancelScheduledStep(stepId);
    setCanceling(null);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {steps.map((step) => {
        const daysAway = Math.ceil((new Date(step.send_at!).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
        return (
          <Card key={step.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-neutral-900">{step.subject}</p>
              <p className="text-xs text-neutral-500">
                {formatLocal(step.send_at!, "EEE, MMM d 'at' h:mm a")} (Eastern) ·{" "}
                {daysAway <= 0 ? "today" : `in ${daysAway} day${daysAway === 1 ? "" : "s"}`}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600">{step.audienceCount} will receive</span>
            <button
              type="button"
              onClick={() => cancel(step.id)}
              disabled={canceling === step.id}
              className="shrink-0 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-600 disabled:opacity-50"
            >
              {canceling === step.id ? "Canceling…" : "Cancel this send"}
            </button>
          </Card>
        );
      })}
    </div>
  );
}
