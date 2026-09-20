import { formatCurrency } from "@/lib/utils";
import type { CommissionKpis as CommissionKpisType } from "@/lib/crm/commission-period";

export function CommissionKpis({ kpis }: { kpis: CommissionKpisType }) {
  const tiles = [
    { label: "Gross GCI", value: formatCurrency(kpis.grossGci) },
    { label: "Net after splits", value: formatCurrency(kpis.netAfterSplits) },
    { label: "Pending", value: String(kpis.pendingCount) },
    { label: "Paid", value: String(kpis.paidCount) },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-2xl border border-[#eadfd6] bg-white px-4 py-4 shadow-card">
          <p className="text-[12px] font-semibold uppercase tracking-[.06em] text-neutral-400">{tile.label}</p>
          <p className="mt-1.5 font-serif text-[28px] font-semibold leading-none text-neutral-900">{tile.value}</p>
        </div>
      ))}
    </div>
  );
}
