import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { KW_CAP } from "@/lib/crm/commission";

export function CommissionMiniCard({
  netCommission,
  underContractNet,
  kwCapLeft,
  kwCapUsedPct,
}: {
  netCommission: number;
  underContractNet: number;
  kwCapLeft: number;
  kwCapUsedPct: number;
}) {
  return (
    <div className="rounded-2xl border border-[#ebe9e7] bg-white p-[18px]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-neutral-900">This commission year</h3>
        <Link href="/commissions" className="text-sm font-medium text-neutral-500">
          View all
        </Link>
      </div>
      <p className="text-[15px] leading-6 text-neutral-700">
        <span className="font-semibold text-neutral-900">{formatCurrency(netCommission)}</span> net so far
      </p>
      <p className="mt-0.5 text-[15px] leading-6 text-neutral-700">
        <span className="font-semibold text-neutral-900">{formatCurrency(underContractNet)}</span> under contract
      </p>
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-sm text-neutral-500">
          <span>KW cap</span>
          <span>{formatCurrency(kwCapLeft)} left of {formatCurrency(KW_CAP)}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full rounded-full bg-neutral-400" style={{ width: `${kwCapUsedPct}%` }} />
        </div>
      </div>
    </div>
  );
}
