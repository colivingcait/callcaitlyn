import { Card, Badge } from "@/components/ui";
import { StatTile } from "@/components/dashboard/StatTile";
import type { CommunitySizeRow, NewVsReturningRow, RepeatAttendanceSeries } from "@/lib/data/events-report";

export function EventCommunityReport({
  communitySize,
  newVsReturning,
  repeatAttendance,
}: {
  communitySize: CommunitySizeRow[];
  newVsReturning: NewVsReturningRow[];
  repeatAttendance: RepeatAttendanceSeries[];
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-neutral-700">Community size &amp; loyalty</h2>

      <div className="grid grid-cols-2 gap-3">
        {communitySize.map((c) => (
          <StatTile key={c.series} label={`${c.series} — all-time attendees`} value={c.uniqueAttendees} tone="good" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {repeatAttendance.map((r) => {
          const nvr = newVsReturning.find((n) => n.series === r.series);
          return (
            <Card key={r.series} className="space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="font-medium text-neutral-800">{r.series}</p>
                <span className="text-xs text-neutral-500">avg {r.avgEventsPerPerson.toFixed(1)} events/person</span>
              </div>
              {nvr && (
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <span>Last event ({nvr.date}):</span>
                  <Badge className="bg-emerald-50 text-emerald-700">{nvr.newCount} new</Badge>
                  <Badge className="bg-brand-50 text-brand-700">{nvr.returningCount} returning</Badge>
                </div>
              )}
              <div className="space-y-1.5">
                {r.distribution.map((d) => (
                  <div key={d.label} className="flex items-center justify-between text-xs text-neutral-500">
                    <span>{d.label}</span>
                    <span className="font-medium text-neutral-700">{d.count}</span>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
