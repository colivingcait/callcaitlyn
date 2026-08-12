import { Card } from "@/components/ui";
import { formatPercent } from "@/lib/utils";
import type { ShowRateSeries } from "@/lib/data/reports";

export function MeetupShowRateReport({ series }: { series: ShowRateSeries[] }) {
  const hasAnyData = series.some((s) => s.months.some((m) => m.registrations > 0 || m.checkIns > 0));

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-neutral-700">Meetup show rate</h2>
      {!hasAnyData ? (
        <p className="text-sm text-neutral-500">No Eventbrite registrations or Jotform check-ins in the last 6 months yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {series.map((s) => (
            <Card key={s.series} className="space-y-2.5">
              <p className="font-medium text-neutral-800">{s.series}</p>
              {s.months.map((m) => (
                <div key={m.key} className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">{m.label}</span>
                  <span className="text-neutral-600">
                    {m.checkIns} of {m.registrations} {m.showRate != null && <span className="font-medium text-neutral-800">({formatPercent(m.showRate, 0)})</span>}
                  </span>
                </div>
              ))}
            </Card>
          ))}
        </div>
      )}
      <p className="text-xs text-neutral-400">
        Approximate — Eventbrite and Jotform don&apos;t share an event ID, so this is registrations vs. check-ins
        bucketed by calendar month, not matched to a specific occurrence. A registration placed near a month
        boundary can land in a different month than its own check-in, so treat this as a trend, not an exact rate.
      </p>
    </div>
  );
}
