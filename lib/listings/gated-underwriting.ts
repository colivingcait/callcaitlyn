import type { ListingFinancials, ListingFinancialsT12Line } from "@/types/database";
import { formatCurrency } from "@/lib/utils";

// Public OM gated stack after unlock: six monthly TTM averages, in this
// order. Ratios are headline cards (GATED_RATIO_FIELDS), not rows.
// purchase_price stays on the financials object for CRM / Apply-to-OM
// but is not rendered in the gated table.
export const GATED_UNDERWRITING_FIELDS = [
  { key: "gross_rents", path: "financials.gross_rents", label: "Gross rents" },
  { key: "net_earnings", path: "financials.net_earnings", label: "Net earnings (after PadSplit)" },
  { key: "opex", path: "financials.opex", label: "OpEx" },
  { key: "noi", path: "financials.noi", label: "NOI" },
  { key: "projected_debt_service", path: "financials.projected_debt_service", label: "Projected debt service" },
  { key: "net_cash_flow", path: "financials.net_cash_flow", label: "Net cash flow" },
] as const;

export const GATED_RATIO_FIELDS = [
  { key: "cash_on_cash", path: "financials.cash_on_cash", label: "Cash on Cash", omLabel: "CASH ON CASH" },
  { key: "cap_rate", path: "financials.cap_rate", label: "Cap Rate", omLabel: "CAP RATE" },
  { key: "dscr", path: "financials.dscr", label: "DSCR Ratio", omLabel: "DSCR RATIO" },
] as const;

export const GATED_PURCHASE_PRICE_FIELD = {
  key: "purchase_price",
  path: "financials.purchase_price",
  label: "Purchase price",
} as const;

// CRM Marketing editor: purchase price + the six monthly lines + ratios.
// Public gated rows use GATED_UNDERWRITING_FIELDS only.
export const GATED_EDITOR_FIELDS = [GATED_PURCHASE_PRICE_FIELD, ...GATED_UNDERWRITING_FIELDS, ...GATED_RATIO_FIELDS] as const;

export const GATED_REMOVED_FIELDS = ["padsplit_fees", "pm_fees", "expense_load_pct", "occupancy_summary", "vacancy_pct"] as const;

export type GatedUnderwritingKey = (typeof GATED_UNDERWRITING_FIELDS)[number]["key"];
export type GatedRatioKey = (typeof GATED_RATIO_FIELDS)[number]["key"];
export type GatedEditorKey = (typeof GATED_EDITOR_FIELDS)[number]["key"];

const GATED_VALUE_FIELDS = [...GATED_UNDERWRITING_FIELDS, ...GATED_RATIO_FIELDS] as const;

function firstNonEmpty(...values: Array<string | number | null | undefined>): string {
  for (const value of values) {
    if (value != null && String(value).trim() !== "") return String(value);
  }
  return "";
}

function t12Value(t12: ListingFinancialsT12Line[] | undefined, pattern: RegExp): string | undefined {
  const line = (t12 ?? []).find((row) => pattern.test(row.label ?? ""));
  if (!line) return undefined;
  const value = (line as ListingFinancialsT12Line & { amount?: string | number }).value ?? (line as { amount?: string | number }).amount;
  return value == null ? undefined : String(value);
}

function parseNumeric(value: string): number | null {
  const n = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

// Stored gated dollars are TTM annual totals (Vera / T12 / scenarios).
// The public OM renders monthly averages: annual / 12. Candace fixture
// 61483.07 → $5,124. Expense-like T12 lines can arrive signed; magnitudes
// display unsigned unless `signed` (net cash flow).
export function formatMonthlyAverage(value: string | null | undefined, options?: { signed?: boolean }): string {
  if (value == null || String(value).trim() === "") return "";
  const n = parseNumeric(String(value));
  if (n == null) return String(value);
  const monthly = n / 12;
  return formatCurrency(options?.signed ? monthly : Math.abs(monthly));
}

// Fill the gated OM keys from explicit sidecar/JSONB fields, then from
// aliases (platform_fees → padsplit_fees) and T12 / first-scenario lines
// when Vera's JSON still uses the older shape. T12 itself is kept in
// JSONB for the numbers but is not shown on the public gated UI.
export function hydrateGatedFinancials(data: ListingFinancials): ListingFinancials {
  const t12 = data.t12 ?? [];
  const scenario = data.scenarios?.[0];
  return {
    ...data,
    purchase_price: firstNonEmpty(data.purchase_price),
    gross_rents: firstNonEmpty(data.gross_rents, t12Value(t12, /gross\s+(collected|rent)/i)),
    padsplit_fees: firstNonEmpty(data.padsplit_fees, data.platform_fees, t12Value(t12, /platform\s+fee|padsplit\s+fee/i)),
    net_earnings: firstNonEmpty(data.net_earnings, t12Value(t12, /net\s+to\s+host|net\s+earnings/i), data.noi),
    opex: firstNonEmpty(data.opex, t12Value(t12, /total\s+operating\s+expenses|^opex$|operating\s+expenses/i)),
    noi: firstNonEmpty(data.noi, t12Value(t12, /^noi$|net\s+operating\s+income/i)),
    projected_debt_service: firstNonEmpty(data.projected_debt_service, scenario?.debt_service, t12Value(t12, /debt\s+service/i)),
    net_cash_flow: firstNonEmpty(data.net_cash_flow, t12Value(t12, /cash\s+flow/i), scenario?.cash_flow),
    cash_on_cash: firstNonEmpty(data.cash_on_cash, scenario?.coc),
    cap_rate: firstNonEmpty(data.cap_rate),
    dscr: firstNonEmpty(data.dscr, scenario?.dscr),
  };
}

export function gatedFinancialsHaveValues(data: ListingFinancials | null | undefined): boolean {
  if (!data) return false;
  return GATED_VALUE_FIELDS.some((field) => Boolean(data[field.key]));
}
