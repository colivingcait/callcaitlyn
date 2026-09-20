import type { ListingFinancials, ListingImprovement, ListingPhotoSource, PadsplitPhoto } from "@/types/database";
import { gatedFinancialsHaveValues, hydrateGatedFinancials } from "@/lib/listings/gated-underwriting";
import { parseListingOccupancy } from "@/lib/listings/occupancy";

// CRM marketing-tab defaults. Same integers as migration 0073, used when a
// listing row is missing those columns (or they came back null/undefined).
export const DEFAULT_DD_DAYS = 10;
export const DEFAULT_SELLER_SUPPORT_DAYS = 30;

export function daysInputValue(n: number | string | null | undefined, fallback: number): string {
  if (n == null || n === "") return String(fallback);
  const value = typeof n === "string" ? Number(n) : n;
  if (typeof value !== "number" || !Number.isFinite(value)) return String(fallback);
  return String(value);
}

// Server-action / JSONB reads can come back as a string or a number-heavy
// object. Always land on the same ListingFinancials shape the gate renders.
export function asListingFinancials(value: unknown): ListingFinancials | null {
  if (value == null || value === "") return null;
  let raw: unknown = value;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (typeof raw !== "object") return null;
  return normalizeFinancials(raw as ListingFinancials);
}

export function normalizeFinancials(financials: ListingFinancials | null | undefined): ListingFinancials {
  const extras = financials ? { ...financials } : {};
  return hydrateGatedFinancials({
    ...extras,
    t12: Array.isArray(financials?.t12) ? financials.t12 : [],
    noi: financials?.noi ?? "",
    cap_rate: financials?.cap_rate ?? "",
    vacancy_pct: financials?.vacancy_pct ?? "",
    occupancy_summary: financials?.occupancy_summary ?? "",
    platform_fees: financials?.platform_fees ?? "",
    padsplit_fees: financials?.padsplit_fees ?? "",
    pm_fees: financials?.pm_fees ?? "",
    expense_load_pct: financials?.expense_load_pct ?? "",
    dscr: financials?.dscr ?? "",
    purchase_price: financials?.purchase_price ?? "",
    gross_rents: financials?.gross_rents ?? "",
    net_earnings: financials?.net_earnings ?? "",
    opex: financials?.opex ?? "",
    projected_debt_service: financials?.projected_debt_service ?? "",
    net_cash_flow: financials?.net_cash_flow ?? financials?.net_cashflow ?? "",
    cash_on_cash: financials?.cash_on_cash ?? "",
    annual: financials?.annual,
    scenarios: Array.isArray(financials?.scenarios) ? financials.scenarios : [],
    occupancy: parseListingOccupancy(financials?.occupancy) ?? undefined,
  });
}

export function financialsHaveContent(data: ListingFinancials | null | undefined): boolean {
  if (!data) return false;
  return (
    gatedFinancialsHaveValues(data) ||
    (data.t12 ?? []).length > 0 ||
    Boolean(data.purchase_price) ||
    Boolean(data.noi) ||
    Boolean(data.vacancy_pct) ||
    Boolean(data.occupancy_summary) ||
    Boolean(data.platform_fees) ||
    Boolean(data.pm_fees) ||
    Boolean(data.expense_load_pct) ||
    Boolean(data.net_cash_flow) ||
    Boolean(data.occupancy?.monthly?.length) ||
    (data.scenarios ?? []).length > 0
  );
}

export function asImprovements(value: ListingImprovement[] | null | undefined): ListingImprovement[] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => ({
    item: row?.item ?? "",
    year: row?.year ?? "",
    cost: row?.cost ?? "",
  }));
}

// Public OM hides the whole CapEx card when the listing has no real rows.
// Blank editor stubs (empty item/year/cost) do not count.
export function visibleImprovements(value: ListingImprovement[] | null | undefined): ListingImprovement[] {
  return asImprovements(value).filter((row) => Boolean(row.item.trim() || row.year.trim() || row.cost.trim()));
}

export function knownImprovementTotal(value: ListingImprovement[] | null | undefined): number {
  return visibleImprovements(value).reduce((sum, row) => {
    const digits = String(row.cost ?? "").replace(/[^0-9.-]/g, "");
    if (!digits) return sum;
    const n = Number(digits);
    return Number.isFinite(n) ? sum + n : sum;
  }, 0);
}

export function asPhotoList(value: PadsplitPhoto[] | null | undefined): PadsplitPhoto[] {
  return Array.isArray(value) ? value : [];
}

export function asUrlList(value: string[] | null | undefined): string[] {
  return Array.isArray(value) ? value : [];
}

export function asPhotoSource(value: unknown): ListingPhotoSource {
  return value === "padsplit" ? "padsplit" : "manual";
}
