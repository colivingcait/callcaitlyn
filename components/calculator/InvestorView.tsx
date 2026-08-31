"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatPercent } from "@/lib/utils";
import type { InvestorMetrics } from "@/lib/crm/house-hack-calc";

export function InvestorView({ metrics }: { metrics: InvestorMetrics }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3.5 overflow-hidden rounded-2xl border border-neutral-200">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2.5 px-4 py-3.5 text-left">
        <span className="text-[15px] font-semibold text-neutral-900">Investor view</span>
        <span className="text-sm text-neutral-500">cap rate, cash-on-cash, both sides rented</span>
        <ChevronDown size={16} className={`ml-auto shrink-0 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="grid grid-cols-3 gap-3.5 border-t border-neutral-100 px-4 py-3.5">
          <Metric label="Cap rate" value={formatPercent(metrics.capRatePct)} />
          <Metric label="Cash on cash" value={formatPercent(metrics.cashOnCashPct)} />
          <Metric label="1% rule" value={formatPercent(metrics.onePercentRulePct, 2)} />
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-0.5 font-serif text-xl font-semibold text-neutral-900">{value}</p>
    </div>
  );
}
