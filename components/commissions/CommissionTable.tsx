import Link from "next/link";
import { formatCurrency, formatPercent, fullName, PROPERTY_TYPE_LABELS } from "@/lib/utils";
import { formatLocal } from "@/lib/format-time";
import { DealRowActions } from "@/components/commissions/DealRowActions";
import type { DealComputedFields } from "@/lib/crm/commission";
import type { DealWithContact } from "@/lib/data/commissions";

export function CommissionTable({ deals }: { deals: (DealWithContact & DealComputedFields)[] }) {
  if (deals.length === 0) {
    return <p className="text-sm text-neutral-500">No closed deals in this commission year yet.</p>;
  }

  const cols = [
    "Closing Date",
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
    <div className="overflow-x-auto rounded-2xl border border-neutral-200/70 bg-white shadow-card">
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
              <tr key={deal.id} className="border-b border-neutral-50 last:border-0 hover:bg-neutral-50">
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
  );
}
