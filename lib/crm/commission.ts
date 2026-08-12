import type { Deal } from "@/types/database";

// KW's commission year was fixed Dec 1 - Nov 30 (not calendar year, not
// her join anniversary) - splits reset to full rate at the start of each
// window and drop to $0 once that window's cap is hit. KW moved the reset
// date to Jan 1 effective 2027, so the cap year that would otherwise have
// run Dec 2025 - Nov 2026 was extended through Dec 31 2026 instead of
// splitting into two, and every cap year from Jan 1 2027 onward is a
// clean calendar year.
export const KW_RATE = 0.3;
export const KW_CAP = 15_000;
export const KWRI_RATE = 0.03;
export const KWRI_CAP = 3_000;
export const FMLS_RATE = 0.0012;
export const TC_FLAT = 500;

const RESET_CHANGE_DATE = new Date(Date.UTC(2027, 0, 1)); // Jan 1, 2027 - new annual reset
const EXTENDED_YEAR_START = new Date(Date.UTC(2025, 11, 1)); // Dec 1, 2025 - last old-cycle start, extended through Dec 31, 2026

export function capYearStart(date: Date): Date {
  if (date.getTime() >= RESET_CHANGE_DATE.getTime()) {
    return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  }
  if (date.getTime() >= EXTENDED_YEAR_START.getTime()) {
    return EXTENDED_YEAR_START;
  }
  const year = date.getUTCMonth() === 11 ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
  return new Date(Date.UTC(year, 11, 1));
}

export function capYearKey(date: Date): string {
  const start = capYearStart(date);
  // The extended transition year keys as "2026" (matching its calendar
  // year, same as every clean year after it) even though it technically
  // starts in Dec 2025 - deliberate, so the year toggle reads plainly.
  if (start.getTime() === EXTENDED_YEAR_START.getTime()) return "2026";
  return `${start.getUTCFullYear()}`;
}

// Displayed as a single calendar year, not the literal Dec-Nov span - a
// pre-2026 cap year keyed "2024" (running Dec 2024 - Nov 2025) shows as
// "2025" since that's where 11 of its 12 months actually fall, matching
// how she thinks of "my 2025 numbers" day to day. The 2026 extended
// transition year (and everything after) already keys off its dominant
// calendar year, so it needs no adjustment.
export function capYearLabel(key: string): string {
  const year = Number(key);
  if (year >= 2026) return `${year}`;
  return `${year + 1}`;
}

export interface DealComputedFields {
  referralFee: number;
  adjustedGross: number;
  kwFee: number;
  kwriFee: number;
  fmlsFee: number;
  tcFee: number;
  totalFees: number;
  netCommission: number;
  pctOfComm: number | null;
  pctOfListPrice: number | null;
  capYear: string;
}

export type DealComputed = Deal & DealComputedFields;

// Generic so joined fields (e.g. the contact a deal came from) pass
// through untouched instead of needing a manual re-lookup after.
//
// The KW/KWRI caps are cumulative across the commission year, so deals
// must be walked in closing-date order and each one's fee depends on how
// much of that year's cap prior deals already used - this can't be
// computed per-deal in isolation, only across the full set for a cap year.
export function computeDeals<T extends Deal>(deals: T[]): (T & DealComputedFields)[] {
  const sorted = [...deals].sort((a, b) => new Date(a.closed_at).getTime() - new Date(b.closed_at).getTime());
  const kwPaid = new Map<string, number>();
  const kwriPaid = new Map<string, number>();

  return sorted.map((deal) => {
    const gross = deal.gross_commission ?? 0;
    const referralFee = deal.manual_split ? (deal.referral_fee ?? 0) : gross * ((deal.referral_pct ?? 0) / 100);
    const adjustedGross = gross - referralFee;

    const capYear = capYearKey(new Date(deal.closed_at));

    // A manual deal's real paid amount still adds to the running cap
    // total (so later formula-computed deals see accurate remaining room)
    // - it's just never itself clamped by the cap, since it already
    // happened exactly as entered.
    const kwPaidSoFar = kwPaid.get(capYear) ?? 0;
    const kwFee = deal.manual_split
      ? (deal.kw_fee ?? 0)
      : Math.min(adjustedGross * KW_RATE, Math.max(KW_CAP - kwPaidSoFar, 0));
    kwPaid.set(capYear, kwPaidSoFar + kwFee);

    const kwriPaidSoFar = kwriPaid.get(capYear) ?? 0;
    const kwriFee = deal.manual_split
      ? (deal.kwri_fee ?? 0)
      : Math.min(adjustedGross * KWRI_RATE, Math.max(KWRI_CAP - kwriPaidSoFar, 0));
    kwriPaid.set(capYear, kwriPaidSoFar + kwriFee);

    const fmlsFee = deal.manual_split ? (deal.fmls_fee ?? 0) : deal.on_fmls ? (deal.sale_price ?? 0) * FMLS_RATE : 0;
    const tcFee = deal.manual_split ? (deal.tc_fee ?? 0) : TC_FLAT;

    const totalFees = referralFee + kwFee + kwriFee + deal.oz_fee + fmlsFee + tcFee + deal.misc_fee;
    const netCommission = gross - totalFees;
    const pctOfComm = gross > 0 ? (netCommission / gross) * 100 : null;
    const pctOfListPrice = deal.sale_price ? (netCommission / deal.sale_price) * 100 : null;

    return {
      ...deal,
      referralFee,
      adjustedGross,
      kwFee,
      kwriFee,
      fmlsFee,
      tcFee,
      totalFees,
      netCommission,
      pctOfComm,
      pctOfListPrice,
      capYear,
    };
  });
}

// Newest first, plus the current cap year even if it has no deals yet -
// otherwise a brand-new commission year would have nowhere to select.
export function listCapYears(deals: Deal[]): string[] {
  const keys = new Set(deals.map((d) => capYearKey(new Date(d.closed_at))));
  keys.add(capYearKey(new Date()));
  return [...keys].sort((a, b) => Number(b) - Number(a));
}

export interface CommissionStats {
  totalDeals: number;
  totalVolume: number;
  totalGCI: number;
  avgSalePrice: number | null;
  avgCommissionRate: number | null;
  totalReferralFees: number;
  totalKW: number;
  totalKWRI: number;
  totalOZ: number;
  totalFMLS: number;
  totalTC: number;
  totalMisc: number;
  totalFees: number;
  netCommissionIncome: number;
  avgNetPerDeal: number | null;
  buyerCount: number;
  sellerCount: number;
  sourceBreakdown: { source: string; count: number }[];
}

export function summarizeDeals(
  deals: (DealComputedFields & Pick<Deal, "sale_price" | "gross_commission" | "side" | "oz_fee" | "misc_fee"> & {
    contacts?: { lead_source: string | null } | null;
  })[],
): CommissionStats {
  const totalDeals = deals.length;
  const totalVolume = deals.reduce((sum, d) => sum + (d.sale_price ?? 0), 0);
  const totalGCI = deals.reduce((sum, d) => sum + (d.gross_commission ?? 0), 0);
  const rates = deals
    .filter((d) => d.sale_price && d.gross_commission)
    .map((d) => (d.gross_commission! / d.sale_price!) * 100);

  const sourceCounts = new Map<string, number>();
  for (const d of deals) {
    const source = d.contacts?.lead_source ?? "Unknown";
    sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
  }

  return {
    totalDeals,
    totalVolume,
    totalGCI,
    avgSalePrice: totalDeals > 0 ? totalVolume / totalDeals : null,
    avgCommissionRate: rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : null,
    totalReferralFees: deals.reduce((sum, d) => sum + d.referralFee, 0),
    totalKW: deals.reduce((sum, d) => sum + d.kwFee, 0),
    totalKWRI: deals.reduce((sum, d) => sum + d.kwriFee, 0),
    totalOZ: deals.reduce((sum, d) => sum + d.oz_fee, 0),
    totalFMLS: deals.reduce((sum, d) => sum + d.fmlsFee, 0),
    totalTC: deals.reduce((sum, d) => sum + d.tcFee, 0),
    totalMisc: deals.reduce((sum, d) => sum + d.misc_fee, 0),
    totalFees: deals.reduce((sum, d) => sum + d.totalFees, 0),
    netCommissionIncome: deals.reduce((sum, d) => sum + d.netCommission, 0),
    avgNetPerDeal: totalDeals > 0 ? deals.reduce((sum, d) => sum + d.netCommission, 0) / totalDeals : null,
    buyerCount: deals.filter((d) => d.side === "buyer").length,
    sellerCount: deals.filter((d) => d.side === "seller").length,
    sourceBreakdown: [...sourceCounts.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count),
  };
}
