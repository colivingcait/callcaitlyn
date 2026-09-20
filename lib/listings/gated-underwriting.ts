import type { ListingFinancials, ListingFinancialsT12Line } from "@/types/database";

export const GATED_UNDERWRITING_FIELDS = [
  { key: "purchase_price", label: "Purchase price" },
  { key: "gross_rents", label: "Gross Rents" },
  { key: "padsplit_fees", label: "PadSplit fees" },
  { key: "net_earnings", label: "Net Earnings" },
  { key: "opex", label: "OpEx" },
  { key: "projected_debt_service", label: "Projected Debt Service" },
  { key: "cash_on_cash", label: "Cash on Cash" },
  { key: "cap_rate", label: "Cap Rate" },
  { key: "dscr", label: "DSCR Ratio" },
] as const;

export type GatedUnderwritingKey = (typeof GATED_UNDERWRITING_FIELDS)[number]["key"];

function firstNonEmpty(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    if (value != null && String(value).trim() !== "") return String(value);
  }
  return "";
}

function t12Value(t12: ListingFinancialsT12Line[] | undefined, pattern: RegExp): string | undefined {
  return (t12 ?? []).find((line) => pattern.test(line.label ?? ""))?.value;
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
    projected_debt_service: firstNonEmpty(data.projected_debt_service, scenario?.debt_service),
    cash_on_cash: firstNonEmpty(data.cash_on_cash, scenario?.coc),
    cap_rate: firstNonEmpty(data.cap_rate),
    dscr: firstNonEmpty(data.dscr, scenario?.dscr),
  };
}

export function gatedFinancialsHaveValues(data: ListingFinancials | null | undefined): boolean {
  if (!data) return false;
  return GATED_UNDERWRITING_FIELDS.some((field) => Boolean(data[field.key]));
}
