import Link from "next/link";
import { Download } from "lucide-react";
import { listWonDeals, listPendingDeals, listUnderContractListings } from "@/lib/data/commissions";
import { computeDeals } from "@/lib/crm/commission";
import { commissionKpis, resolveCommissionPeriod, visibleCommissionRows } from "@/lib/crm/commission-period";
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
  const kpis = commissionKpis(rows);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-[32px] font-semibold leading-9 tracking-[-0.03em] text-neutral-900 lg:text-[40px]">Commissions</h1>
          <p className="mt-1.5 text-[15px] text-neutral-500">Period filter scopes the tiles and the table. Export matches what you see.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <PeriodFilter current={period} />
          <Link
            href={`/api/commissions/export?period=${period}`}
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#eadfd6] bg-white px-3.5 text-[13px] font-semibold text-neutral-800"
          >
            <Download size={14} /> Export
          </Link>
          <BulkImportButton />
          <AddPastDealButton />
        </div>
      </div>

      <div className="mt-6">
        <CommissionKpis kpis={kpis} />
      </div>

      <div className="mt-5">
        <CommissionTable rows={rows} />
      </div>
    </div>
  );
}
