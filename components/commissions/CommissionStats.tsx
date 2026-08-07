import { StatTile } from "@/components/dashboard/StatTile";
import { Card } from "@/components/ui";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import { KW_CAP, KWRI_CAP } from "@/lib/crm/commission";
import type { CommissionStats as CommissionStatsType } from "@/lib/crm/commission";

export function CommissionStats({
  stats,
  pendingKw = 0,
  pendingKwri = 0,
}: {
  stats: CommissionStatsType;
  pendingKw?: number;
  pendingKwri?: number;
}) {
  const kwRemaining = Math.max(KW_CAP - stats.totalKW, 0);
  const kwriRemaining = Math.max(KWRI_CAP - stats.totalKWRI, 0);
  const teamFeesTotal = stats.totalOZ + stats.totalTC + stats.totalFMLS;
  const otherTotal = stats.totalReferralFees + stats.totalMisc;

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

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Fees paid this commission year</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="space-y-1.5 text-sm">
            <FeeLine label="KW" value={stats.totalKW} />
            <FeeLine label="KWRI" value={stats.totalKWRI} />
            <FeeLine label="Total" value={stats.totalKW + stats.totalKWRI} bold divider />
          </Card>

          <Card className="space-y-1.5 text-sm">
            <FeeLine label="FMLS" value={stats.totalFMLS} />
            <FeeLine label="Team Fees" value={stats.totalOZ} />
            <FeeLine label="TC Fee" value={stats.totalTC} />
            <FeeLine label="Total" value={teamFeesTotal} bold divider />
          </Card>

          <Card className="space-y-1.5 text-sm">
            <FeeLine label="Referrals" value={stats.totalReferralFees} />
            <FeeLine label="Misc." value={stats.totalMisc} />
            <FeeLine label="Total" value={otherTotal} bold divider />
          </Card>

          <Card className="space-y-2 text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Cap status</p>
            <CapMeter label="KW" paid={stats.totalKW} cap={KW_CAP} remaining={kwRemaining} projected={pendingKw} />
            <CapMeter label="KWRI" paid={stats.totalKWRI} cap={KWRI_CAP} remaining={kwriRemaining} projected={pendingKwri} />
          </Card>
        </div>
      </div>

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

function FeeLine({
  label,
  value,
  note,
  bold,
  divider,
}: {
  label: string;
  value: number;
  note?: string;
  bold?: boolean;
  divider?: boolean;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-2", divider && "mt-1 border-t border-neutral-100 pt-1.5")}>
      <span className="text-neutral-500">
        {label}
        {note && <span className="ml-1 text-[10px] text-amber-600">({note})</span>}
      </span>
      <span className={bold ? "font-semibold text-neutral-900" : "text-neutral-700"}>{formatCurrency(value)}</span>
    </div>
  );
}

// `projected` is the sum of this cap's fee across deals still Under
// Contract - already run through the same cap-clamping logic as paid
// deals (see computeDeals), so it can never push paid+projected past the
// cap. The lighter segment shows how much of the remaining room a pending
// deal is on track to use.
function CapMeter({
  label,
  paid,
  cap,
  remaining,
  projected = 0,
}: {
  label: string;
  paid: number;
  cap: number;
  remaining: number;
  projected?: number;
}) {
  const paidPct = Math.min((paid / cap) * 100, 100);
  const projectedPct = Math.min(((paid + projected) / cap) * 100, 100) - paidPct;
  const capped = remaining <= 0;
  const remainingAfterProjected = Math.max(remaining - projected, 0);

  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-neutral-500">{label}</span>
        <span className={capped ? "font-semibold text-red-600" : "text-neutral-700"}>
          {capped ? "Capped" : `${formatCurrency(remaining)} left`}
        </span>
      </div>
      <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-neutral-100">
        <div className={cn("h-full", capped ? "bg-red-500" : "bg-brand-500")} style={{ width: `${paidPct}%` }} />
        {projected > 0 && <div className="h-full bg-amber-400" style={{ width: `${projectedPct}%` }} />}
      </div>
      <p className="mt-0.5 text-[10px] text-neutral-400">
        {formatCurrency(paid)} of {formatCurrency(cap)} paid
        {projected > 0 &&
          ` · +${formatCurrency(projected)} projected from deals under contract, ${formatCurrency(remainingAfterProjected)} would remain`}
      </p>
    </div>
  );
}
