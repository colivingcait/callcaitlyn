import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import type { CommissionKpis as CommissionKpisType } from "@/lib/crm/commission-period";

export function CommissionKpis({ kpis }: { kpis: CommissionKpisType }) {
  const tiles = [
    {
      label: "Gross GCI",
      value: formatCurrency(kpis.grossGci),
      sub: kpis.gciDeltaPct == null ? null : `${kpis.gciDeltaPct >= 0 ? "↑" : "↓"} ${formatPercent(Math.abs(kpis.gciDeltaPct))} vs last period`,
      tone: kpis.gciDeltaPct == null ? "muted" : kpis.gciDeltaPct >= 0 ? "up" : "down",
    },
    {
      label: "Net after splits",
      value: formatCurrency(kpis.netAfterSplits),
      sub: kpis.netDeltaPct == null ? null : `${kpis.netDeltaPct >= 0 ? "↑" : "↓"} ${formatPercent(Math.abs(kpis.netDeltaPct))} vs last period`,
      tone: kpis.netDeltaPct == null ? "muted" : kpis.netDeltaPct >= 0 ? "up" : "down",
    },
    {
      label: "Pending",
      value: formatCurrency(kpis.pendingAmount),
      sub: `${kpis.pendingCount} deal${kpis.pendingCount === 1 ? "" : "s"}`,
      tone: "muted",
    },
    {
      label: "Paid",
      value: formatCurrency(kpis.paidAmount),
      sub: `${kpis.paidCount} deal${kpis.paidCount === 1 ? "" : "s"}`,
      tone: "muted",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-2xl bg-white px-5 py-5 shadow-card">
          <p className="text-[13px] text-neutral-400">{tile.label}</p>
          <p className="mt-2 text-[28px] font-semibold leading-none tracking-[-0.03em] text-neutral-900">{tile.value}</p>
          {tile.sub && (
            <p
              className={cn(
                "mt-2 text-[12px]",
                tile.tone === "up" && "text-emerald-600",
                tile.tone === "down" && "text-red-500",
                tile.tone === "muted" && "text-neutral-400",
              )}
            >
              {tile.sub}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
