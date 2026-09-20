import Link from "next/link";
import { formatLocal } from "@/lib/format-time";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import { DealRowActions } from "@/components/commissions/DealRowActions";
import { CommissionPromptButton } from "@/components/commissions/CommissionPromptButton";
import type { CommissionRow } from "@/lib/crm/commission-period";

export function CommissionTable({ rows }: { rows: CommissionRow[] }) {
  if (rows.length === 0) {
    return <p className="rounded-2xl border border-[#eadfd6] bg-white px-4 py-8 text-center text-[15px] text-neutral-400">No deals in this period.</p>;
  }

  return (
    <>
      <div className="space-y-2.5 lg:hidden">
        {rows.map((row) => (
          <CommissionCard key={row.id} row={row} />
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-[#eadfd6] bg-white shadow-card lg:block">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-[#eadfd6] text-[12px] font-semibold uppercase tracking-[.06em] text-neutral-400">
              <th className="px-4 py-2.5 font-semibold">Address/deal</th>
              <th className="px-3 py-2.5 font-semibold">Side</th>
              <th className="px-3 py-2.5 font-semibold">Stage</th>
              <th className="px-3 py-2.5 font-semibold">GCI</th>
              <th className="px-3 py-2.5 font-semibold">Split %</th>
              <th className="px-3 py-2.5 font-semibold">Your net</th>
              <th className="px-3 py-2.5 font-semibold">Status</th>
              <th className="px-3 py-2.5 font-semibold">Due date</th>
              <th className="px-4 py-2.5 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-neutral-100 last:border-0 hover:bg-[#fcfbfa]">
                <td className="px-4 py-2.5 font-medium text-neutral-900">
                  <AddressCell row={row} />
                </td>
                <td className="px-3 py-2.5 text-neutral-600">{row.side}</td>
                <td className="px-3 py-2.5 text-neutral-600">{row.stage}</td>
                <td className="whitespace-nowrap px-3 py-2.5">{formatCurrency(row.gci)}</td>
                <td className="whitespace-nowrap px-3 py-2.5">{formatPercent(row.splitPct)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-neutral-900">{formatCurrency(row.net)}</td>
                <td className="px-3 py-2.5">
                  <StatusChip status={row.status} />
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-neutral-600">{row.dueDate ? formatLocal(row.dueDate, "MMM d, yyyy") : "—"}</td>
                <td className="px-4 py-2.5">
                  <RowActions row={row} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AddressCell({ row }: { row: CommissionRow }) {
  if (row.listingId) {
    return (
      <Link href={`/listings/${row.listingId}`} className="text-brand-700 hover:underline">
        {row.address}
      </Link>
    );
  }
  if (row.deal?.contacts) {
    return (
      <div>
        <Link href={`/contacts/${row.deal.contacts.id}`} className="text-brand-700 hover:underline">
          {row.address}
        </Link>
      </div>
    );
  }
  return <span>{row.address}</span>;
}

function StatusChip({ status }: { status: "Pending" | "Paid" }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-semibold",
        status === "Paid" ? "bg-emerald-50 text-emerald-700" : "bg-[#f7f1ea] text-brand-700",
      )}
    >
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
    <div className="rounded-2xl border border-[#eadfd6] bg-white p-3.5 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <AddressCell row={row} />
          <p className="mt-0.5 text-sm text-neutral-500">
            {row.side} · {row.stage}
          </p>
        </div>
        <StatusChip status={row.status} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-neutral-400">GCI</p>
          <p className="font-medium text-neutral-800">{formatCurrency(row.gci)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-neutral-400">Split %</p>
          <p className="font-medium text-neutral-800">{formatPercent(row.splitPct)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-neutral-400">Your net</p>
          <p className="font-semibold text-neutral-900">{formatCurrency(row.net)}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-sm text-neutral-400">Due {row.dueDate ? formatLocal(row.dueDate, "MMM d, yyyy") : "—"}</p>
        <RowActions row={row} />
      </div>
    </div>
  );
}
