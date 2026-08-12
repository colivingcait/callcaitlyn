import { Card } from "@/components/ui";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { EventRoiRow } from "@/lib/data/events-report";

export function EventRoiReport({ rows }: { rows: EventRoiRow[] }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-neutral-700">Event ROI</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {rows.map((r) => (
          <Card key={r.series} className="space-y-2">
            <p className="font-medium text-neutral-800">{r.series}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-neutral-400">Attendees</p>
                <p className="font-semibold text-neutral-900">{r.attendeeCount}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">Became clients</p>
                <p className="font-semibold text-neutral-900">
                  {r.convertedCount} <span className="text-xs font-normal text-neutral-500">({formatPercent(r.conversionRate, 1)})</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">Gross commission</p>
                <p className="font-semibold text-emerald-600">{formatCurrency(r.grossCommission)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">Avg. days to convert</p>
                <p className="font-semibold text-neutral-900">{r.avgDaysToConvert != null ? Math.round(r.avgDaysToConvert) : "—"}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <p className="text-xs text-neutral-400">
        Gross commission (before fees) from every client who ever attended, not just their first deal. Attendance is
        measured by Jotform check-in — an Eventbrite registration alone doesn&apos;t count as attending.
      </p>
    </div>
  );
}
