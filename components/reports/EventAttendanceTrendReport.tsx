import { Card } from "@/components/ui";
import type { AttendanceTrendSeries } from "@/lib/data/events-report";

export function EventAttendanceTrendReport({ series }: { series: AttendanceTrendSeries[] }) {
  const maxCount = Math.max(...series.flatMap((s) => s.months.map((m) => m.count)), 1);

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-neutral-700">Attendance trend (check-ins, last 6 months)</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {series.map((s) => (
          <Card key={s.series} className="space-y-2.5">
            <p className="font-medium text-neutral-800">{s.series}</p>
            {s.months.map((m) => (
              <div key={m.key} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-xs text-neutral-500">{m.label}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-neutral-100">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max((m.count / maxCount) * 100, m.count > 0 ? 4 : 0)}%` }} />
                </div>
                <span className="w-6 shrink-0 text-right text-xs font-medium text-neutral-700">{m.count}</span>
              </div>
            ))}
          </Card>
        ))}
      </div>
    </div>
  );
}
