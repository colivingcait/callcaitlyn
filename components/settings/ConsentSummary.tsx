import type { ConsentSummary } from "@/lib/data/consent";

export function ConsentSummaryCard({ summary }: { summary: ConsentSummary }) {
  return (
    <div>
      <p className="text-sm font-semibold text-neutral-700">
        Who can be texted · {summary.total} yes · {summary.optedOut} opted out
      </p>
      <p className="mt-1.5 text-sm leading-5 text-neutral-500">
        Every contact records how you got permission — registered for an event, gave you their number in person,
        replied to you first — and the date. Anyone who replies STOP is marked immediately and excluded from every
        blast, with a line on their record saying when.
      </p>
      {summary.bySource.length > 0 && (
        <div className="mt-3 space-y-1">
          {summary.bySource.map((s) => (
            <div key={s.label} className="flex items-center justify-between text-sm">
              <span className="text-neutral-600">{s.label}</span>
              <span className="font-medium text-neutral-900">{s.count}</span>
            </div>
          ))}
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-600">Opted out</span>
            <span className="font-medium text-red-700">{summary.optedOut}</span>
          </div>
        </div>
      )}
      <p className="mt-3 text-xs text-neutral-400">
        A blast always shows the real recipient count before it sends — registered, can be texted, and opted out
        counted separately.
      </p>
    </div>
  );
}
