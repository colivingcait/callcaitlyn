import type { ListingFinancials, ListingFinancialsT12Line } from "@/types/database";
import { formatCurrency } from "@/lib/utils";

// Public OM gated stack after unlock: six monthly T12 averages, in this
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

function nearlyEqual(a: number, b: number, rel = 0.02): boolean {
  if (a === b) return true;
  const scale = Math.max(Math.abs(a), Math.abs(b), 1);
  return Math.abs(a - b) <= Math.max(1, scale * rel);
}

// Vera Apply contract: gated flats are monthly. Some sidecars still put
// the annual total on `net_cashflow` / `net_cash_flow` (Candace 15669.09
// vs monthly 1305.76). Detect that and store/display the monthly figure
// so NCF ≈ monthly NOI − monthly DS.
export function monthlyizeNetCashFlow(
  value: string | null | undefined,
  context?: { noi?: string | null; debtService?: string | null; annualCashFlow?: string | null },
): string {
  if (value == null || String(value).trim() === "") return "";
  const n = parseNumeric(String(value));
  if (n == null) return String(value);

  const noi = context?.noi != null && String(context.noi).trim() !== "" ? parseNumeric(String(context.noi)) : null;
  const ds =
    context?.debtService != null && String(context.debtService).trim() !== ""
      ? parseNumeric(String(context.debtService))
      : null;
  const annual =
    context?.annualCashFlow != null && String(context.annualCashFlow).trim() !== ""
      ? parseNumeric(String(context.annualCashFlow))
      : null;
  const expectedMonthly = noi != null && ds != null ? noi - ds : null;

  const looksAnnual =
    (annual != null && nearlyEqual(Math.abs(n), Math.abs(annual))) ||
    (expectedMonthly != null && nearlyEqual(Math.abs(n), Math.abs(expectedMonthly) * 12)) ||
    (noi != null && Math.abs(noi) > 0 && Math.abs(n) > Math.abs(noi) * 2.5);

  if (!looksAnnual) return String(value);
  if (expectedMonthly != null) return String(Math.round(expectedMonthly * 100) / 100);
  return String(Math.round((n / 12) * 100) / 100);
}

export const GATED_MONTHLY_DOLLAR_FIELDS = [
  "gross_rents",
  "net_earnings",
  "opex",
  "noi",
  "projected_debt_service",
  "net_cash_flow",
] as const;

// Vera Apply contract: gated flat $ fields are already T12 monthly
// (annual ÷ 12). Public OM formats them as currency — do not divide again.
// Candace 5123.59 → $5,124. Expense-like lines can arrive signed;
// magnitudes display unsigned unless `signed` (net cash flow).
export function formatMonthlyAverage(value: string | null | undefined, options?: { signed?: boolean }): string {
  if (value == null || String(value).trim() === "") return "";
  const n = parseNumeric(String(value));
  if (n == null) return String(value);
  return formatCurrency(options?.signed ? n : Math.abs(n));
}

// T12 line items and scenario cash/debt stay annual. Only use this when
// hydrating a missing gated monthly field from those annual sources.
export function annualToMonthlyString(value: string | null | undefined): string | undefined {
  if (value == null || String(value).trim() === "") return undefined;
  const n = parseNumeric(String(value));
  if (n == null) return String(value);
  return String(Math.round((n / 12) * 100) / 100);
}

// Fill the gated OM keys from explicit sidecar/JSONB fields, then from
// aliases (platform_fees → padsplit_fees) and T12 / first-scenario lines
// when Vera's JSON still uses the older shape. T12 itself is kept in
// JSONB for the numbers but is not shown on the public gated UI.
export function hydrateGatedFinancials(data: ListingFinancials): ListingFinancials {
  const t12 = data.t12 ?? [];
  const scenario = data.scenarios?.[0];
  const extras = data as ListingFinancials & { net_cashflow?: string };
  const annual = data.annual;
  const noi = firstNonEmpty(data.noi, annualToMonthlyString(t12Value(t12, /^noi$|net\s+operating\s+income/i)));
  const projectedDebtService = firstNonEmpty(
    data.projected_debt_service,
    annualToMonthlyString(scenario?.debt_service),
    annualToMonthlyString(t12Value(t12, /debt\s+service/i)),
  );
  const rawCashFlow = firstNonEmpty(
    data.net_cash_flow,
    extras.net_cashflow,
    annualToMonthlyString(t12Value(t12, /cash\s+flow/i)),
    annualToMonthlyString(scenario?.cash_flow),
  );
  return {
    ...data,
    purchase_price: firstNonEmpty(data.purchase_price),
    gross_rents: firstNonEmpty(data.gross_rents, annualToMonthlyString(t12Value(t12, /gross\s+(collected|rent)/i))),
    padsplit_fees: firstNonEmpty(data.padsplit_fees, data.platform_fees, t12Value(t12, /platform\s+fee|padsplit\s+fee/i)),
    net_earnings: firstNonEmpty(data.net_earnings, annualToMonthlyString(t12Value(t12, /net\s+to\s+host|net\s+earnings/i)), data.noi),
    opex: firstNonEmpty(data.opex, annualToMonthlyString(t12Value(t12, /total\s+operating\s+expenses|^opex$|operating\s+expenses/i))),
    noi,
    projected_debt_service: projectedDebtService,
    net_cash_flow: monthlyizeNetCashFlow(rawCashFlow, {
      noi,
      debtService: projectedDebtService,
      annualCashFlow: firstNonEmpty(annual?.net_cash_flow, annual?.net_cashflow),
    }),
    cash_on_cash: firstNonEmpty(data.cash_on_cash, scenario?.coc),
    cap_rate: firstNonEmpty(data.cap_rate),
    dscr: firstNonEmpty(data.dscr, scenario?.dscr),
  };
}

export function displayGatedMonthlyAverage(
  financials: ListingFinancials,
  key: GatedUnderwritingKey,
): string {
  const raw = financials[key];
  const value =
    key === "net_cash_flow"
      ? monthlyizeNetCashFlow(raw, {
          noi: financials.noi,
          debtService: financials.projected_debt_service,
        })
      : raw;
  return formatMonthlyAverage(value, { signed: key === "net_cash_flow" });
}

export function gatedFinancialsHaveValues(data: ListingFinancials | null | undefined): boolean {
  if (!data) return false;
  return GATED_VALUE_FIELDS.some((field) => Boolean(data[field.key]));
}
