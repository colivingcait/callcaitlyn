import { formatCurrency } from "@/lib/utils";
import { InvestorView } from "@/components/calculator/InvestorView";
import type { HouseHackBreakdown } from "@/lib/crm/house-hack-calc";

export function ResultCard({ firstName, breakdown }: { firstName: string; breakdown: HouseHackBreakdown }) {
  const name = firstName.trim() || "they";

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <p className="text-[15px] text-neutral-600">What {name} actually pay{name === "they" ? "" : "s"} each month</p>
      <p className="mt-1.5 font-serif text-[40px] font-semibold leading-[48px] text-neutral-900">{formatCurrency(breakdown.monthlyOutOfPocket)}</p>
      {breakdown.comparisonDelta != null && (
        <p className="mt-1 text-base leading-6 text-neutral-600">
          {Math.abs(breakdown.comparisonDelta) < 25 ? (
            <>That&apos;s about the same as what {name} pay{name === "they" ? "" : "s"} now.</>
          ) : breakdown.comparisonDelta > 0 ? (
            <>
              That&apos;s <strong className="font-semibold text-neutral-900">{formatCurrency(breakdown.comparisonDelta)} less</strong> than what {name}{" "}
              pay{name === "they" ? "" : "s"} now, and {name === "they" ? "they own" : "they'll own"} it.
            </>
          ) : (
            <>
              That&apos;s <strong className="font-semibold text-neutral-900">{formatCurrency(Math.abs(breakdown.comparisonDelta))} more</strong> than what{" "}
              {name} pay{name === "they" ? "" : "s"} now.
            </>
          )}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-3">
        <Row label="Principal and interest" value={formatCurrency(breakdown.monthlyPrincipalInterest)} />
        <Row label="Taxes and insurance" value={formatCurrency(breakdown.monthlyTaxesInsurance)} />
        {breakdown.monthlyMortgageInsurance > 0 && <Row label="Mortgage insurance" value={formatCurrency(breakdown.monthlyMortgageInsurance)} />}
        {breakdown.monthlyRentCredit > 0 && <Row label="Rent from the other side" value={`−${formatCurrency(breakdown.monthlyRentCredit)}`} />}
        <Row label="Maintenance set-aside" value={formatCurrency(breakdown.monthlyMaintenance)} />
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-base font-semibold text-neutral-900">Out of pocket</span>
          <span className="text-lg font-semibold text-neutral-900">{formatCurrency(breakdown.monthlyOutOfPocket)}</span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3.5 border-t border-neutral-100 pt-4">
        <div>
          <p className="text-[15px] text-neutral-600">Cash to close</p>
          <p className="mt-1 font-serif text-2xl font-semibold text-neutral-900">{formatCurrency(breakdown.cashToClose)}</p>
          <p className="text-sm text-neutral-500">down payment plus closing costs</p>
        </div>
        {breakdown.bothSidesRentedOutOfPocket != null && (
          <div>
            <p className="text-[15px] text-neutral-600">If both sides rented</p>
            <p className="mt-1 font-serif text-2xl font-semibold text-neutral-900">{formatCurrency(breakdown.bothSidesRentedOutOfPocket)}</p>
            {breakdown.bothSidesRentedDelta != null && <p className="text-sm text-neutral-500">{formatCurrency(Math.abs(breakdown.bothSidesRentedDelta))} {breakdown.bothSidesRentedDelta >= 0 ? "less" : "more"} a month</p>}
          </div>
        )}
      </div>

      {breakdown.investor && <InvestorView metrics={breakdown.investor} />}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-neutral-100 pb-3">
      <span className="text-base text-neutral-600">{label}</span>
      <span className="text-base font-semibold text-neutral-900">{value}</span>
    </div>
  );
}
