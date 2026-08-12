import { Card } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import type { CapYearComparisonRow } from "@/lib/data/reports";

export function CapYearComparisonReport({ rows }: { rows: CapYearComparisonRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-700">Cap year comparison</h2>
        <p className="text-sm text-neutral-500">No closed deals yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-neutral-700">Cap year comparison</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {rows.map((r, i) => (
          <Card key={r.capYear} className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-neutral-400">
              {r.label}
              {i === 0 && <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-600">Current</span>}
            </p>
            <p className="font-serif text-xl font-semibold text-emerald-600">{formatCurrency(r.netCommissionIncome)}</p>
            <p className="text-xs text-neutral-500">
              {r.totalDeals} deal{r.totalDeals === 1 ? "" : "s"} · {formatCurrency(r.totalGCI)} gross
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
