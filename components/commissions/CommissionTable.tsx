import Link from "next/link";
import { Building2, Check } from "lucide-react";
import { formatLocal } from "@/lib/format-time";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import { DealRowActions } from "@/components/commissions/DealRowActions";
import { CommissionPromptButton } from "@/components/commissions/CommissionPromptButton";
import type { CommissionRow } from "@/lib/crm/commission-period";

export function CommissionTable({ rows, rangeLabel }: { rows: CommissionRow[]; rangeLabel: string }) {
  if (rows.length === 0) {
    return <p className="px-1 py-10 text-center text-[15px] text-neutral-400">No deals in this period.</p>;
  }

  return (
    <>
      <div className="space-y-2.5 lg:hidden">
        {rows.map((row) => (
          <CommissionCard key={row.id} row={row} />
        ))}
        <p className="px-1 pt-2 text-center text-[12px] text-neutral-400">
          Showing {rows.length} deal{rows.length === 1 ? "" : "s"} for {rangeLabel}
        </p>
      </div>

      <div className="hidden lg:block">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="text-[11px] font-semibold uppercase tracking-[.08em] text-neutral-400">
              <th className="pb-3 pr-3 font-semibold">Address/deal</th>
              <th className="px-3 pb-3 font-semibold">Side</th>
              <th className="px-3 pb-3 font-semibold">Stage</th>
              <th className="px-3 pb-3 font-semibold">GCI</th>
              <th className="px-3 pb-3 font-semibold">Split %</th>
              <th className="px-3 pb-3 font-semibold">Your net</th>
              <th className="px-3 pb-3 font-semibold">Status</th>
              <th className="px-3 pb-3 font-semibold">Due date</th>
              <th className="pb-3 pl-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-[#f0e7df]">
                <td className="py-3.5 pr-3">
                  <AddressCell row={row} />
                </td>
                <td className="px-3 py-3.5 text-neutral-600">{row.side}</td>
                <td className="px-3 py-3.5">
                  <span className="inline-flex items-center gap-1 text-neutral-600">
                    {row.stage === "Closed" && <Check size={13} className="text-emerald-600" />}
                    {row.stage}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-3.5 text-neutral-800">{formatCurrency(row.gci)}</td>
                <td className="whitespace-nowrap px-3 py-3.5 text-neutral-800">{formatPercent(row.splitPct, 0)}</td>
                <td className="whitespace-nowrap px-3 py-3.5 font-medium text-neutral-900">{formatCurrency(row.net)}</td>
                <td className="px-3 py-3.5">
                  <StatusChip status={row.status} />
                </td>
                <td className="whitespace-nowrap px-3 py-3.5 text-neutral-500">{row.dueDate ? formatLocal(row.dueDate, "MMM d, yyyy") : "—"}</td>
                <td className="py-3.5 pl-3">
                  <RowActions row={row} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-[#f0e7df] pt-4 text-center text-[12px] text-neutral-400">
          Showing {rows.length} deal{rows.length === 1 ? "" : "s"} for {rangeLabel}
        </p>
      </div>
    </>
  );
}

function AddressCell({ row }: { row: CommissionRow }) {
  const title = (
    <span className="font-medium text-neutral-900">{row.address}</span>
  );
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#f7f1ea] text-neutral-400">
        <Building2 size={14} />
      </span>
      <div className="min-w-0">
        {row.listingId ? (
          <Link href={`/listings/${row.listingId}`} className="hover:text-brand-700">
            {title}
          </Link>
        ) : row.deal?.contacts ? (
          <Link href={`/contacts/${row.deal.contacts.id}`} className="hover:text-brand-700">
            {title}
          </Link>
        ) : (
          title
        )}
        {row.subtitle && <p className="mt-0.5 text-[12px] text-neutral-400">{row.subtitle}</p>}
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: "Pending" | "Paid" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[13px] font-medium",
        status === "Paid" ? "text-emerald-700" : "text-brand-700",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", status === "Paid" ? "bg-emerald-500" : "bg-brand-500")} />
      {status}
    </span>
  );
}

function RowActions({ row }: { row: CommissionRow }) {
  return (
    <div className="flex items-center justify-end gap-2">
      {row.needsPrompt && (
        <CommissionPromptButton
          deal={row.deal}
          listing={row.listingId ? { id: row.listingId, address: row.address, list_price: row.listPrice ?? null } : undefined}
        />
      )}
      {row.deal && <DealRowActions deal={row.deal} />}
    </div>
  );
}

function CommissionCard({ row }: { row: CommissionRow }) {
  return (
    <div className="rounded-2xl bg-white p-3.5 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <AddressCell row={row} />
        <StatusChip status={row.status} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-neutral-400">GCI</p>
          <p className="font-medium text-neutral-800">{formatCurrency(row.gci)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-neutral-400">Split %</p>
          <p className="font-medium text-neutral-800">{formatPercent(row.splitPct, 0)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-neutral-400">Your net</p>
          <p className="font-semibold text-neutral-900">{formatCurrency(row.net)}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-sm text-neutral-400">
          {row.side} · {row.stage} · Due {row.dueDate ? formatLocal(row.dueDate, "MMM d, yyyy") : "—"}
        </p>
        <RowActions row={row} />
      </div>
    </div>
  );
}
