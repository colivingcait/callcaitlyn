import Link from "next/link";
import { cn } from "@/lib/utils";
import { COMMISSION_PERIODS, type CommissionPeriod } from "@/lib/crm/commission-period";

export function PeriodFilter({ current }: { current: CommissionPeriod }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {COMMISSION_PERIODS.map((period) => (
        <Link
          key={period.key}
          href={`/commissions?period=${period.key}`}
          className={cn(
            "flex h-10 items-center rounded-full border px-3.5 text-[13px] font-medium",
            period.key === current ? "border-transparent bg-brand-600 text-white" : "border-[#eadfd6] bg-white text-neutral-600",
          )}
        >
          {period.label}
        </Link>
      ))}
    </div>
  );
}
