import Link from "next/link";
import { formatCurrency, formatPercent, fullName, PROPERTY_TYPE_LABELS, cn } from "@/lib/utils";
import { formatLocal } from "@/lib/format-time";
import { DealRowActions } from "@/components/commissions/DealRowActions";
import type { DealComputedFields } from "@/lib/crm/commission";
import type { DealWithContact } from "@/lib/data/commissions";

export function CommissionTable({
  deals,
  pending = false,
}: {
  deals: (DealWithContact & DealComputedFields)[];
  pending?: boolean;
}) {
  if (deals.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        {pending ? "Nothing under contract right now." : "No closed deals in this commission year yet."}
      </p>
    );
  }

  const cols = [
    pending ? "Entered UC" : "Closing Date",
    "Client / Address",
    "Sale Price",
    "Comm %",
    "Gross Comp",
    "Side",
    "Referral",
    "KW",
    "KWRI",
    "OZ",
    "FMLS",
    "TC",
    "Misc",
    "Total Fees",
    "Net Comm",
    "% of Comm",
    "% of List",
    "",
  ];

  return (
    <>
      {/* Mobile: one card per deal, key numbers up front, the other 13
          columns tucked behind "Fee breakdown" - the desktop table's 18
          columns in an overflow-x-auto strip just meant endless sideways
          scrolling through tiny text on a phone. */}
      <div className="space-y-2.5 md:hidden">
        {deals.map((deal) => (
          <CommissionCard key={deal.id} deal={deal} pending={pending} />
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-neutral-200/70 bg-white shadow-card md:block">
        <table className="w-full min-w-[1100px] text-left text-xs">
          <thead>
            <tr className="border-b border-neutral-100 text-neutral-400">
              {cols.map((c) => (
                <th key={c} className="whitespace-nowrap px-3 py-2 font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deals.map((deal) => {
              const commRate = deal.sale_price && deal.gross_commission ? (deal.gross_commission / deal.sale_price) * 100 : null;
              return (
                <tr
                  key={deal.id}
                  className={cn(
                    "border-b border-neutral-50 last:border-0 hover:bg-neutral-50",
                    pending && "bg-amber-50/40",
                  )}
                >
                  <td className="whitespace-nowrap px-3 py-2 text-neutral-600">{formatLocal(deal.closed_at, "MMM d, yyyy")}</td>
                  <td className="px-3 py-2">
                    {deal.contacts ? (
                      <Link href={`/contacts/${deal.contacts.id}`} className="font-medium text-brand-700 hover:underline">
                        {fullName(deal.contacts)}
                      </Link>
                    ) : deal.client_name ? (
                      <span className="font-medium text-neutral-700">{deal.client_name}</span>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                    {deal.address && <p className="text-neutral-400">{deal.address}</p>}
                    {deal.property_type && <p className="text-neutral-300">{PROPERTY_TYPE_LABELS[deal.property_type]}</p>}
                    {deal.manual_split && <p className="text-[10px] uppercase tracking-wide text-amber-600">Manual fees</p>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{formatCurrency(deal.sale_price)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{formatPercent(commRate, 2)}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium">{formatCurrency(deal.gross_commission)}</td>
                  <td className="whitespace-nowrap px-3 py-2 capitalize text-neutral-500">{deal.side ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{formatCurrency(deal.referralFee)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{formatCurrency(deal.kwFee)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{formatCurrency(deal.kwriFee)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{formatCurrency(deal.oz_fee)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{formatCurrency(deal.fmlsFee)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{formatCurrency(deal.tcFee)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{formatCurrency(deal.misc_fee)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-neutral-600">{formatCurrency(deal.totalFees)}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-semibold text-neutral-900">{formatCurrency(deal.netCommission)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{formatPercent(deal.pctOfComm)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{formatPercent(deal.pctOfListPrice, 2)}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <DealRowActions deal={deal} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CommissionCard({ deal, pending }: { deal: DealWithContact & DealComputedFields; pending: boolean }) {
  const commRate = deal.sale_price && deal.gross_commission ? (deal.gross_commission / deal.sale_price) * 100 : null;

  return (
    <div className={cn("rounded-2xl border border-neutral-200/70 bg-white p-3.5 shadow-card", pending && "bg-amber-50/40")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {deal.contacts ? (
            <Link href={`/contacts/${deal.contacts.id}`} className="truncate font-medium text-brand-700 hover:underline">
              {fullName(deal.contacts)}
            </Link>
          ) : deal.client_name ? (
            <span className="truncate font-medium text-neutral-700">{deal.client_name}</span>
          ) : (
            <span className="text-neutral-400">—</span>
          )}
          {deal.address && <p className="truncate text-xs text-neutral-400">{deal.address}</p>}
          {deal.property_type && <p className="text-xs text-neutral-300">{PROPERTY_TYPE_LABELS[deal.property_type]}</p>}
          {deal.manual_split && <p className="text-[10px] uppercase tracking-wide text-amber-600">Manual fees</p>}
        </div>
        <div className="shrink-0">
          <DealRowActions deal={deal} />
        </div>
      </div>

      <div className="mt-2.5 flex items-baseline justify-between gap-2">
        <span className="text-xs text-neutral-400">
          {pending ? "Entered UC" : "Closed"} {formatLocal(deal.closed_at, "MMM d, yyyy")}
        </span>
        <span className="font-semibold text-neutral-900">{formatCurrency(deal.netCommission)}</span>
      </div>

      <details className="mt-2.5 border-t border-neutral-100 pt-2.5">
        <summary className="cursor-pointer text-xs font-medium text-brand-600">Fee breakdown</summary>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          <DetailRow label="Sale price" value={formatCurrency(deal.sale_price)} />
          <DetailRow label="Comm %" value={formatPercent(commRate, 2)} />
          <DetailRow label="Gross comp" value={formatCurrency(deal.gross_commission)} />
          <DetailRow label="Side" value={deal.side ?? "—"} className="capitalize" />
          <DetailRow label="Referral" value={formatCurrency(deal.referralFee)} />
          <DetailRow label="KW" value={formatCurrency(deal.kwFee)} />
          <DetailRow label="KWRI" value={formatCurrency(deal.kwriFee)} />
          <DetailRow label="OZ" value={formatCurrency(deal.oz_fee)} />
          <DetailRow label="FMLS" value={formatCurrency(deal.fmlsFee)} />
          <DetailRow label="TC" value={formatCurrency(deal.tcFee)} />
          <DetailRow label="Misc" value={formatCurrency(deal.misc_fee)} />
          <DetailRow label="Total fees" value={formatCurrency(deal.totalFees)} />
          <DetailRow label="% of comm" value={formatPercent(deal.pctOfComm)} />
          <DetailRow label="% of list" value={formatPercent(deal.pctOfListPrice, 2)} />
        </div>
      </details>
    </div>
  );
}

function DetailRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-neutral-400">{label}</span>
      <span className={cn("text-neutral-700", className)}>{value}</span>
    </div>
  );
}
