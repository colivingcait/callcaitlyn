import { Card } from "@/components/ui";
import { formatLocal } from "@/lib/format-time";
import type { UpcomingBroadcastStep } from "@/lib/data/sequences";

export function UpcomingBroadcastPanel({ steps }: { steps: UpcomingBroadcastStep[] }) {
  if (steps.length === 0) {
    return <Card className="text-sm text-neutral-500">No upcoming sends scheduled.</Card>;
  }

  return (
    <div className="space-y-2">
      {steps.map((step) => {
        const daysAway = Math.ceil((new Date(step.send_at!).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
        return (
          <Card key={step.id} className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-neutral-900">{step.subject}</p>
              <p className="text-xs text-neutral-500">
                {formatLocal(step.send_at!, "EEE, MMM d 'at' h:mm a")} (Eastern) ·{" "}
                {daysAway <= 0 ? "today" : `in ${daysAway} day${daysAway === 1 ? "" : "s"}`}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600">
              {step.audienceCount} will receive
            </span>
          </Card>
        );
      })}
    </div>
  );
}
