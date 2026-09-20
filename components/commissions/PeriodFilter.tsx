"use client";

import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { COMMISSION_PERIODS, type CommissionPeriod } from "@/lib/crm/commission-period";

export function PeriodFilter({ current }: { current: CommissionPeriod }) {
  const router = useRouter();
  return (
    <label className="inline-flex items-center gap-2 rounded-full border border-[#eadfd6] bg-white px-3 py-1.5 text-[13px] text-neutral-700">
      <CalendarDays size={14} className="text-neutral-400" />
      <select
        value={current}
        onChange={(e) => router.push(`/commissions?period=${e.target.value}`)}
        className="bg-transparent text-[13px] font-medium text-neutral-800 outline-none"
        aria-label="Period filter"
      >
        {COMMISSION_PERIODS.map((period) => (
          <option key={period.key} value={period.key}>
            {period.label}
          </option>
        ))}
      </select>
    </label>
  );
}
