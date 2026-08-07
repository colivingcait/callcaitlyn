import { StatTile } from "@/components/dashboard/StatTile";
import { Card } from "@/components/ui";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { KW_CAP, KWRI_CAP } from "@/lib/crm/commission";
import type { CommissionStats as CommissionStatsType } from "@/lib/crm/commission";

export function CommissionStats({ stats }: { stats: CommissionStatsType }) {
  const kwCapped = stats.totalKW >= KW_CAP;
  const kwriCapped = stats.totalKWRI >= KWRI_CAP;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Deals closed" value={stats.totalDeals} />
        <StatTile label="Total volume" value={formatCurrency(stats.totalVolume)} />
        <StatTile label="Total GCI" value={formatCurrency(stats.totalGCI)} />
        <StatTile label="Net commission" value={formatCurrency(stats.netCommissionIncome)} tone="good" />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Avg sale price" value={formatCurrency(stats.avgSalePrice)} />
        <StatTile label="Avg commission rate" value={formatPercent(stats.avgCommissionRate, 2)} />
        <StatTile label="Avg net per deal" value={formatCurrency(stats.avgNetPerDeal)} />
        <StatTile
          label="Buyer / Seller split"
          value={`${stats.buyerCount} / ${stats.sellerCount}`}
        />
      </div>

      <Card className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-700">Fees paid this commission year</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
          <FeeLine label="KW" value={stats.totalKW} note={kwCapped ? `capped at ${formatCurrency(KW_CAP)}` : undefined} />
          <FeeLine label="KWRI" value={stats.totalKWRI} note={kwriCapped ? `capped at ${formatCurrency(KWRI_CAP)}` : undefined} />
          <FeeLine label="OZ" value={stats.totalOZ} />
          <FeeLine label="FMLS" value={stats.totalFMLS} />
          <FeeLine label="TC" value={stats.totalTC} />
          <FeeLine label="Misc" value={stats.totalMisc} />
          <FeeLine label="Referral" value={stats.totalReferralFees} />
          <FeeLine label="Total fees" value={stats.totalFees} bold />
        </div>
      </Card>

      {stats.sourceBreakdown.length > 0 && (
        <Card className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-700">Deals by lead source</h3>
          <div className="flex flex-wrap gap-2 text-sm">
            {stats.sourceBreakdown.map((s) => (
              <span key={s.source} className="rounded-full bg-neutral-100 px-3 py-1 text-neutral-600">
                {s.source}: {s.count} ({formatPercent((s.count / stats.totalDeals) * 100, 0)})
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function FeeLine({ label, value, note, bold }: { label: string; value: number; note?: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-neutral-500">
        {label}
        {note && <span className="ml-1 text-[10px] text-amber-600">({note})</span>}
      </span>
      <span className={bold ? "font-semibold text-neutral-900" : "text-neutral-700"}>{formatCurrency(value)}</span>
    </div>
  );
}
