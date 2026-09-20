import { Check } from "lucide-react";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import { commissionKpiComparisonLabel, type CommissionKpis as CommissionKpisType, type CommissionPeriod } from "@/lib/crm/commission-period";

export function CommissionKpis({ kpis, period }: { kpis: CommissionKpisType; period: CommissionPeriod }) {
  const vs = commissionKpiComparisonLabel(period);
  const tiles = [
    {
      label: "Gross GCI",
      value: formatCurrency(kpis.grossGci),
      sub: kpis.gciDeltaPct == null ? null : `${kpis.gciDeltaPct >= 0 ? "↑" : "↓"} ${formatPercent(Math.abs(kpis.gciDeltaPct))} ${vs}`,
      tone: kpis.gciDeltaPct == null ? "muted" : kpis.gciDeltaPct >= 0 ? "up" : "down",
    },
    {
      label: "Net after splits",
      value: formatCurrency(kpis.netAfterSplits),
      sub: kpis.netDeltaPct == null ? null : `${kpis.netDeltaPct >= 0 ? "↑" : "↓"} ${formatPercent(Math.abs(kpis.netDeltaPct))} ${vs}`,
      tone: kpis.netDeltaPct == null ? "muted" : kpis.netDeltaPct >= 0 ? "up" : "down",
    },
    {
      label: "Pending",
      value: formatCurrency(kpis.pendingAmount),
      sub: `${kpis.pendingCount} deal${kpis.pendingCount === 1 ? "" : "s"}`,
      tone: "pending" as const,
    },
    {
      label: "Paid",
      value: formatCurrency(kpis.paidAmount),
      sub: `${kpis.paidCount} deal${kpis.paidCount === 1 ? "" : "s"}`,
      tone: "paid" as const,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-3">
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-xl border border-[#eadfd6] bg-white px-4 py-3.5">
          <p className="text-[12px] font-medium text-neutral-500">{tile.label}</p>
          <p className="mt-1.5 font-display text-[24px] font-semibold leading-none tracking-[-0.03em] text-neutral-900 lg:text-[26px]">
            {tile.value}
          </p>
          {tile.sub && (
            <p
              className={cn(
                "mt-1.5 inline-flex items-center gap-1 text-[12px]",
                tile.tone === "up" && "text-emerald-600",
                tile.tone === "down" && "text-red-500",
                tile.tone === "muted" && "text-neutral-400",
                tile.tone === "pending" && "text-neutral-400",
                tile.tone === "paid" && "text-emerald-600",
              )}
            >
              {tile.tone === "pending" && <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />}
              {tile.tone === "paid" && <Check size={12} strokeWidth={2.4} />}
              {tile.sub}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
