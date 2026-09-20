import Link from "next/link";
import { Download } from "lucide-react";
import { listWonDeals, listPendingDeals, listUnderContractListings } from "@/lib/data/commissions";
import { computeDeals } from "@/lib/crm/commission";
import {
  commissionKpis,
  commissionPeriodRangeLabel,
  previousPeriodBounds,
  resolveCommissionPeriod,
  rowsInBounds,
  visibleCommissionRows,
} from "@/lib/crm/commission-period";
import { CommissionTable } from "@/components/commissions/CommissionTable";
import { CommissionKpis } from "@/components/commissions/CommissionKpis";
import { PeriodFilter } from "@/components/commissions/PeriodFilter";
import { AddPastDealButton } from "@/components/commissions/AddPastDealButton";
import { BulkImportButton } from "@/components/commissions/BulkImportButton";

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const period = resolveCommissionPeriod(params.period);
  const [wonDeals, pendingDeals, ucListings] = await Promise.all([listWonDeals(), listPendingDeals(), listUnderContractListings()]);
  const computed = computeDeals([...wonDeals, ...pendingDeals]);
  const rows = visibleCommissionRows(computed, ucListings, period);
  const previousRows = rowsInBounds(computed, previousPeriodBounds(period));
  const kpis = commissionKpis(rows, previousRows);
  const rangeLabel = commissionPeriodRangeLabel(period);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[28px] font-semibold leading-8 tracking-[-0.03em] text-neutral-900 lg:text-[32px]">Commissions</h1>
            <span className="inline-flex items-center gap-1.5 text-[12px] text-neutral-400">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              period filter
            </span>
          </div>
          <div className="mt-3">
            <PeriodFilter current={period} />
          </div>
        </div>
        <Link
          href={`/api/commissions/export?period=${period}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#eadfd6] bg-white px-3.5 text-[13px] font-medium text-neutral-700"
        >
          <Download size={14} /> Export
        </Link>
      </div>

      <div className="mt-8">
        <CommissionKpis kpis={kpis} />
      </div>

      <div className="mt-8">
        <CommissionTable rows={rows} rangeLabel={rangeLabel} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-[13px] text-neutral-400">
        <BulkImportButton />
        <AddPastDealButton />
      </div>
    </div>
  );
}
