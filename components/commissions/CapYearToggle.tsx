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
            "rounded-full border px-3 py-1.5 text-xs font-medium",
            year === current ? "border-transparent bg-brand-600 text-white" : "border-neutral-200 text-neutral-600",
          )}
        >
          {capYearLabel(year)}
        </Link>
      ))}
    </div>
  );
}
