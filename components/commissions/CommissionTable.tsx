import Link from "next/link";
import { Building2, Check, Clock, Home, Tag, User } from "lucide-react";
import { formatLocal } from "@/lib/format-time";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
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
                <td className="px-3 py-3.5">
                  <SideChip side={row.side} />
                </td>
                <td className="px-3 py-3.5">
                  <StageChip stage={row.stage} />
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
  const title = <span className="font-medium text-neutral-900">{row.address}</span>;
  const Icon = row.listingId ? Building2 : Home;
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#f3e4dc] text-[#c45c4a]">
        <Icon size={14} />
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

function pillClass(tone: "cream" | "terracotta" | "green") {
  return cn(
    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium",
    tone === "cream" && "border border-[#eadfd6] bg-white text-neutral-700",
    tone === "terracotta" && "bg-[#f3e4dc] text-[#c45c4a]",
    tone === "green" && "bg-[#e8f5e9] text-[#2e7d32]",
  );
}

function SideChip({ side }: { side: CommissionRow["side"] }) {
  if (side === "—") return <span className="text-neutral-400">—</span>;
  return (
    <span className={pillClass("cream")}>
      {side === "List" ? <Tag size={11} /> : <User size={11} />}
      {side}
    </span>
  );
}

function StageChip({ stage }: { stage: CommissionRow["stage"] }) {
  if (stage === "Closed") {
    return (
      <span className={pillClass("green")}>
        <Check size={12} strokeWidth={2.4} />
        Closed
      </span>
    );
  }
  return <span className={pillClass("terracotta")}>UC</span>;
}

function StatusChip({ status }: { status: "Pending" | "Paid" }) {
  if (status === "Paid") {
    return (
      <span className={pillClass("green")}>
        <Check size={12} strokeWidth={2.4} />
        Paid
      </span>
    );
  }
  return (
    <span className={pillClass("terracotta")}>
      <Clock size={12} />
      Pending
    </span>
  );
}

function RowActions({ row }: { row: CommissionRow }) {
  if (!row.needsPrompt) return null;
  return (
    <div className="flex items-center justify-end">
      <CommissionPromptButton
        deal={row.deal}
        listing={row.listingId ? { id: row.listingId, address: row.address, list_price: row.listPrice ?? null } : undefined}
      />
    </div>
  );
}

function CommissionCard({ row }: { row: CommissionRow }) {
  return (
    <div className="rounded-2xl border border-[#eadfd6] bg-[#fffbf8] p-3.5">
      <div className="flex items-start justify-between gap-2">
        <AddressCell row={row} />
        <StatusChip status={row.status} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <SideChip side={row.side} />
        <StageChip stage={row.stage} />
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
        <p className="text-sm text-neutral-400">Due {row.dueDate ? formatLocal(row.dueDate, "MMM d, yyyy") : "—"}</p>
        <RowActions row={row} />
      </div>
    </div>
  );
}
