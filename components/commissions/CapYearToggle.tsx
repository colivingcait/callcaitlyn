import Link from "next/link";
import { cn } from "@/lib/utils";
import { capYearLabel } from "@/lib/crm/commission";

export function CapYearToggle({ years, current }: { years: string[]; current: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {years.map((year) => (
        <Link
          key={year}
          href={`/commissions?year=${year}`}
          className={cn(
            "flex h-11 items-center rounded-full border px-3.5 text-[13px] font-medium md:h-auto md:px-3 md:py-1.5 md:text-xs",
            year === current ? "border-transparent bg-brand-600 text-white" : "border-neutral-200 text-neutral-600",
          )}
        >
          {capYearLabel(year)}
        </Link>
      ))}
    </div>
  );
}
