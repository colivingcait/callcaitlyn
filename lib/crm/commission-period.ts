import { fromZonedTime } from "date-fns-tz";
import { APP_TIMEZONE, formatLocal } from "@/lib/format-time";
import { formatCurrency, formatPercent, fullName } from "@/lib/utils";
import type { Deal, DealSide, DealStatus } from "@/types/database";
import type { DealComputedFields } from "@/lib/crm/commission";
import type { DealWithContact } from "@/lib/data/commissions";

export type CommissionPeriod = "this_month" | "last_month" | "this_quarter" | "this_year" | "all";

export const COMMISSION_PERIODS: { key: CommissionPeriod; label: string }[] = [
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "this_quarter", label: "This quarter" },
  { key: "this_year", label: "This year" },
  { key: "all", label: "All time" },
];

export type CommissionRow = {
  id: string;
  address: string;
  side: "Buy" | "List" | "—";
  stage: "UC" | "Closed";
  gci: number | null;
  splitPct: number | null;
  net: number;
  status: "Pending" | "Paid";
  dueDate: string | null;
  needsPrompt: boolean;
  listingId?: string;
  listPrice?: number | null;
  deal?: DealWithContact & DealComputedFields;
};

export type CommissionKpis = {
  grossGci: number;
  netAfterSplits: number;
  pendingCount: number;
  paidCount: number;
};

export type UnderContractListing = {
  id: string;
  address: string;
  list_price: number | null;
  status: "under_contract";
};

export function resolveCommissionPeriod(param: string | undefined): CommissionPeriod {
  if (param === "last_month" || param === "this_quarter" || param === "this_year" || param === "all") return param;
  return "this_month";
}

function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function startOfLocalDay(dateYmd: string): Date {
  return fromZonedTime(`${dateYmd}T00:00:00`, APP_TIMEZONE);
}

export function commissionPeriodBounds(period: CommissionPeriod, now = new Date()): { start: Date | null; end: Date | null } {
  if (period === "all") return { start: null, end: null };
  const [year, month] = formatLocal(now, "yyyy-MM-dd").split("-").map(Number);
  if (period === "this_month") {
    return { start: startOfLocalDay(ymd(year, month, 1)), end: null };
  }
  if (period === "last_month") {
    const previousYear = month === 1 ? year - 1 : year;
    const previousMonth = month === 1 ? 12 : month - 1;
    return { start: startOfLocalDay(ymd(previousYear, previousMonth, 1)), end: startOfLocalDay(ymd(year, month, 1)) };
  }
  if (period === "this_quarter") {
    const quarterStartMonth = Math.floor((month - 1) / 3) * 3 + 1;
    return { start: startOfLocalDay(ymd(year, quarterStartMonth, 1)), end: null };
  }
  return { start: startOfLocalDay(ymd(year, 1, 1)), end: null };
}

export function isoInPeriod(iso: string | null | undefined, period: CommissionPeriod, now = new Date()): boolean {
  if (!iso) return period === "all";
  const { start, end } = commissionPeriodBounds(period, now);
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return false;
  if (start && time < start.getTime()) return false;
  if (end && time >= end.getTime()) return false;
  return true;
}

export function dealPeriodDate(deal: Pick<Deal, "status" | "closed_at" | "expected_closing_date">): string {
  if (deal.status === "pending" && deal.expected_closing_date) return deal.expected_closing_date;
  return deal.closed_at;
}

export function needsCommissionPrompt(deal: Pick<Deal, "status" | "gross_commission" | "side" | "sale_price">): boolean {
  return deal.status === "pending";
}

export function dealSideLabel(side: DealSide | null | undefined): "Buy" | "List" | "—" {
  if (side === "buyer") return "Buy";
  if (side === "seller") return "List";
  return "—";
}

export function dealStageLabel(status: DealStatus): "UC" | "Closed" {
  return status === "pending" ? "UC" : "Closed";
}

export function dealPayStatus(status: DealStatus): "Pending" | "Paid" {
  return status === "pending" ? "Pending" : "Paid";
}

export function listingMatchesDealAddress(listingAddress: string, dealAddress: string | null | undefined): boolean {
  if (!dealAddress) return false;
  return listingAddress.trim().toLowerCase() === dealAddress.trim().toLowerCase();
}

export function toCommissionRow(deal: DealWithContact & DealComputedFields): CommissionRow {
  const name = deal.contacts ? fullName(deal.contacts) : deal.client_name;
  return {
    id: deal.id,
    address: deal.address || name || "Untitled deal",
    side: dealSideLabel(deal.side),
    stage: dealStageLabel(deal.status),
    gci: deal.gross_commission,
    splitPct: deal.pctOfComm,
    net: deal.netCommission,
    status: dealPayStatus(deal.status),
    dueDate: deal.status === "pending" ? deal.expected_closing_date : deal.closed_at,
    needsPrompt: needsCommissionPrompt(deal),
    deal,
  };
}

export function listingPromptRow(listing: UnderContractListing): CommissionRow {
  return {
    id: `listing:${listing.id}`,
    address: listing.address,
    side: "List",
    stage: "UC",
    gci: null,
    splitPct: null,
    net: 0,
    status: "Pending",
    dueDate: null,
    needsPrompt: true,
    listingId: listing.id,
    listPrice: listing.list_price,
  };
}

export function visibleCommissionRows(
  deals: (DealWithContact & DealComputedFields)[],
  listings: UnderContractListing[],
  period: CommissionPeriod,
  now = new Date(),
): CommissionRow[] {
  const inPeriod = deals.filter((deal) => isoInPeriod(dealPeriodDate(deal), period, now));
  const pendingAlways = deals.filter((deal) => deal.status === "pending" && !inPeriod.includes(deal));
  const dealRows = [...inPeriod, ...pendingAlways].map(toCommissionRow);

  const covered = new Set(
    deals.filter((deal) => deal.address).map((deal) => deal.address!.trim().toLowerCase()),
  );
  const listingRows = listings
    .filter((listing) => !covered.has(listing.address.trim().toLowerCase()))
    .map(listingPromptRow);

  return [...listingRows, ...dealRows].sort((a, b) => {
    if (a.needsPrompt !== b.needsPrompt) return a.needsPrompt ? -1 : 1;
    return (b.dueDate ?? "").localeCompare(a.dueDate ?? "");
  });
}

export function commissionKpis(rows: CommissionRow[]): CommissionKpis {
  const paid = rows.filter((row) => row.status === "Paid");
  return {
    grossGci: paid.reduce((sum, row) => sum + (row.gci ?? 0), 0),
    netAfterSplits: paid.reduce((sum, row) => sum + row.net, 0),
    pendingCount: rows.filter((row) => row.status === "Pending").length,
    paidCount: paid.length,
  };
}

export function exportCommissionRows(rows: CommissionRow[]): string {
  const headers = ["Address/deal", "Side", "Stage", "GCI", "Split %", "Your net", "Status", "Due date"];
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.address,
        row.side,
        row.stage,
        row.gci == null ? "" : String(Math.round(row.gci)),
        row.splitPct == null ? "" : row.splitPct.toFixed(1),
        String(Math.round(row.net)),
        row.status,
        row.dueDate ? formatLocal(row.dueDate, "yyyy-MM-dd") : "",
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return `${lines.join("\r\n")}\r\n`;
}

export function commissionExportFilename(period: CommissionPeriod, now = new Date()): string {
  return `commissions-${period.replace(/_/g, "-")}-${formatLocal(now, "yyyy-MM-dd")}.csv`;
}

export function formatCommissionMoney(value: number | null | undefined): string {
  return formatCurrency(value);
}

export function formatSplitPct(value: number | null | undefined): string {
  return formatPercent(value);
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
