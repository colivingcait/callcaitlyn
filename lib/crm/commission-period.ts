import { fromZonedTime } from "date-fns-tz";
import { APP_TIMEZONE, formatLocal } from "@/lib/format-time";
import { formatCurrency, formatPercent, fullName, PROPERTY_TYPE_LABELS } from "@/lib/utils";
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
  subtitle?: string | null;
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
  pendingAmount: number;
  paidAmount: number;
  pendingCount: number;
  paidCount: number;
  gciDeltaPct: number | null;
  netDeltaPct: number | null;
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
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    return { start: startOfLocalDay(ymd(year, month, 1)), end: startOfLocalDay(ymd(nextYear, nextMonth, 1)) };
  }
  if (period === "last_month") {
    const previousYear = month === 1 ? year - 1 : year;
    const previousMonth = month === 1 ? 12 : month - 1;
    return { start: startOfLocalDay(ymd(previousYear, previousMonth, 1)), end: startOfLocalDay(ymd(year, month, 1)) };
  }
  if (period === "this_quarter") {
    const quarterStartMonth = Math.floor((month - 1) / 3) * 3 + 1;
    const nextQuarterMonth = quarterStartMonth + 3;
    const endYear = nextQuarterMonth > 12 ? year + 1 : year;
    const endMonth = nextQuarterMonth > 12 ? nextQuarterMonth - 12 : nextQuarterMonth;
    return { start: startOfLocalDay(ymd(year, quarterStartMonth, 1)), end: startOfLocalDay(ymd(endYear, endMonth, 1)) };
  }
  return { start: startOfLocalDay(ymd(year, 1, 1)), end: startOfLocalDay(ymd(year + 1, 1, 1)) };
}

export function previousCommissionPeriod(period: CommissionPeriod, now = new Date()): CommissionPeriod | null {
  if (period === "this_month") return "last_month";
  if (period === "all") return null;
  return period;
}

export function previousPeriodBounds(period: CommissionPeriod, now = new Date()): { start: Date | null; end: Date | null } {
  if (period === "this_month") return commissionPeriodBounds("last_month", now);
  if (period === "last_month") {
    const last = commissionPeriodBounds("last_month", now);
    if (!last.start) return { start: null, end: null };
    const [year, month] = formatLocal(last.start, "yyyy-MM-dd").split("-").map(Number);
    const previousYear = month === 1 ? year - 1 : year;
    const previousMonth = month === 1 ? 12 : month - 1;
    return { start: startOfLocalDay(ymd(previousYear, previousMonth, 1)), end: last.start };
  }
  if (period === "this_quarter") {
    const current = commissionPeriodBounds("this_quarter", now);
    if (!current.start) return { start: null, end: null };
    const [year, month] = formatLocal(current.start, "yyyy-MM-dd").split("-").map(Number);
    const previousMonth = month === 1 ? 10 : month - 3;
    const previousYear = month === 1 ? year - 1 : year;
    return { start: startOfLocalDay(ymd(previousYear, previousMonth, 1)), end: current.start };
  }
  if (period === "this_year") {
    const [year] = formatLocal(now, "yyyy-MM-dd").split("-").map(Number);
    return { start: startOfLocalDay(ymd(year - 1, 1, 1)), end: startOfLocalDay(ymd(year, 1, 1)) };
  }
  return { start: null, end: null };
}

export function isoInBounds(iso: string | null | undefined, bounds: { start: Date | null; end: Date | null }): boolean {
  if (!iso) return !bounds.start && !bounds.end;
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return false;
  if (bounds.start && time < bounds.start.getTime()) return false;
  if (bounds.end && time >= bounds.end.getTime()) return false;
  return true;
}

export function commissionPeriodRangeLabel(period: CommissionPeriod, now = new Date()): string {
  if (period === "all") return "all time";
  const { start, end } = commissionPeriodBounds(period, now);
  if (!start) return COMMISSION_PERIODS.find((p) => p.key === period)?.label ?? period;
  const lastDay = end ? new Date(end.getTime() - 1) : now;
  return `${formatLocal(start, "MMMM d")} – ${formatLocal(lastDay, "MMMM d, yyyy")}`;
}

export function percentDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export function commissionKpiComparisonLabel(period: CommissionPeriod): string {
  if (period === "this_month" || period === "last_month") return "vs last month";
  if (period === "this_quarter") return "vs last quarter";
  if (period === "this_year") return "vs last year";
  return "vs last period";
}

export function isoInPeriod(iso: string | null | undefined, period: CommissionPeriod, now = new Date()): boolean {
  return isoInBounds(iso, commissionPeriodBounds(period, now));
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
    subtitle: deal.property_type ? PROPERTY_TYPE_LABELS[deal.property_type] ?? deal.property_type : name && deal.address ? name : null,
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
    subtitle: "Listing",
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

export function commissionKpis(rows: CommissionRow[], previousRows: CommissionRow[] = []): CommissionKpis {
  const paid = rows.filter((row) => row.status === "Paid");
  const pending = rows.filter((row) => row.status === "Pending");
  const previousPaid = previousRows.filter((row) => row.status === "Paid");
  const grossGci = rows.reduce((sum, row) => sum + (row.gci ?? 0), 0);
  const netAfterSplits = paid.reduce((sum, row) => sum + row.net, 0);
  const previousGross = previousRows.reduce((sum, row) => sum + (row.gci ?? 0), 0);
  const previousNet = previousPaid.reduce((sum, row) => sum + row.net, 0);
  return {
    grossGci,
    netAfterSplits,
    pendingAmount: pending.reduce((sum, row) => sum + (row.gci ?? 0), 0),
    paidAmount: paid.reduce((sum, row) => sum + (row.gci ?? 0), 0),
    pendingCount: pending.length,
    paidCount: paid.length,
    gciDeltaPct: previousRows.length ? percentDelta(grossGci, previousGross) : null,
    netDeltaPct: previousRows.length ? percentDelta(netAfterSplits, previousNet) : null,
  };
}

export function rowsInBounds(
  deals: (DealWithContact & DealComputedFields)[],
  bounds: { start: Date | null; end: Date | null },
): CommissionRow[] {
  return deals.filter((deal) => isoInBounds(dealPeriodDate(deal), bounds)).map(toCommissionRow);
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
