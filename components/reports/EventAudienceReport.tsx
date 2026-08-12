import { Card } from "@/components/ui";
import type { AudienceBreakdown } from "@/lib/data/events-report";

function BarRows({ rows }: { rows: { label: string; count: number }[] }) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-xs text-neutral-500">{r.label}</span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max((r.count / max) * 100, r.count > 0 ? 4 : 0)}%` }} />
          </div>
          <span className="w-6 shrink-0 text-right text-xs font-medium text-neutral-700">{r.count}</span>
        </div>
      ))}
    </div>
  );
}

export function EventAudienceReport({
  contactType,
  journeyStage,
}: {
  contactType: AudienceBreakdown[];
  journeyStage: { label: string; count: number }[];
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-neutral-700">Who&apos;s in the room</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {contactType.map((s) => (
          <Card key={s.series} className="space-y-2">
            <p className="font-medium text-neutral-800">{s.series} — contact type</p>
            {s.rows.length === 0 ? <p className="text-xs text-neutral-400">No attendees yet.</p> : <BarRows rows={s.rows} />}
          </Card>
        ))}
      </div>
      <Card className="space-y-2">
        <p className="font-medium text-neutral-800">House Hacking — journey stage</p>
        <p className="text-xs text-neutral-400">Only House Hacking events ask this question, so Women&apos;s REI isn&apos;t shown here.</p>
        <BarRows rows={journeyStage} />
      </Card>
    </div>
  );
}
