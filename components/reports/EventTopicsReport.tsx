import { Card } from "@/components/ui";
import type { EventTopicRow } from "@/lib/data/events-report";

export function EventTopicsReport({ rows }: { rows: EventTopicRow[] }) {
  const maxCount = Math.max(...rows.map((r) => r.registrations), 1);

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-neutral-700">Top event topics (all-time Eventbrite registrations)</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500">No Eventbrite registrations yet.</p>
      ) : (
        <Card className="space-y-2.5">
          {rows.map((r) => (
            <div key={r.eventName} className="flex items-center gap-3">
              <span className="w-48 shrink-0 truncate text-xs text-neutral-500">{r.eventName}</span>
              <div className="h-4 flex-1 overflow-hidden rounded-full bg-neutral-100">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max((r.registrations / maxCount) * 100, 4)}%` }} />
              </div>
              <span className="w-10 shrink-0 text-right text-xs font-medium text-neutral-700">{r.registrations}</span>
            </div>
          ))}
        </Card>
      )}
      <p className="text-xs text-neutral-400">Useful for picking which topics to pair with which sponsors going forward.</p>
    </div>
  );
}
