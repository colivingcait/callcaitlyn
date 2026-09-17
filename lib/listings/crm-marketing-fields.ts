import type { ListingFinancials, ListingImprovement, PadsplitPhoto } from "@/types/database";

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

export function normalizeFinancials(financials: ListingFinancials | null | undefined): ListingFinancials {
  return {
    t12: Array.isArray(financials?.t12) ? financials.t12 : [],
    noi: financials?.noi ?? "",
    cap_rate: financials?.cap_rate ?? "",
    vacancy_pct: financials?.vacancy_pct ?? "",
    occupancy_summary: financials?.occupancy_summary ?? "",
    scenarios: Array.isArray(financials?.scenarios) ? financials.scenarios : [],
  };
}

export function asImprovements(value: ListingImprovement[] | null | undefined): ListingImprovement[] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => ({
    item: row?.item ?? "",
    year: row?.year ?? "",
    cost: row?.cost ?? "",
  }));
}

export function asPhotoList(value: PadsplitPhoto[] | null | undefined): PadsplitPhoto[] {
  return Array.isArray(value) ? value : [];
}

export function asUrlList(value: string[] | null | undefined): string[] {
  return Array.isArray(value) ? value : [];
}
