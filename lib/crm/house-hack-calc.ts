import type { LoanType } from "@/types/database";

// Every rate below is a documented, adjustable placeholder, not a precise
// lender lookup - precision here comes from her overwriting the inputs
// (rent, taxes, insurance), the same way the calculator's own footer copy
// tells the recipient. Bump calc_version on a saved quote whenever these
// change, so a future job can find quotes computed under stale numbers.
export const MAINTENANCE_RATE_ANNUAL = 0.01; // 1%/year of purchase price
export const CLOSING_COST_RATE = 0.025; // 2.5% of purchase price
export const FHA_UFMIP_RATE = 0.0175; // upfront, financed into the loan
export const FHA_ANNUAL_MIP_LOW_DOWN = 0.0055; // down payment < 5%
export const FHA_ANNUAL_MIP_STD = 0.005; // down payment >= 5%
export const CONVENTIONAL_PMI_RATE = 0.005; // flat, applies only below 20% down
export const COMPARISON_NEGLIGIBLE_THRESHOLD = 25; // dollars, below this reads as "about the same"

export function loanTermMonths(loanType: LoanType): number {
  return loanType === "conventional_15" ? 180 : 360;
}

export type HouseHackInputs = {
  purchasePrice: number;
  downPaymentPct: number;
  interestRatePct: number;
  loanType: LoanType;
  rentFromOtherUnit: number | null;
  taxesAnnual: number;
  insuranceAnnual: number;
  rentingNow: number | null;
};

export type InvestorMetrics = {
  capRatePct: number;
  cashOnCashPct: number;
  onePercentRulePct: number;
};

export type InvestorMetricsInput = {
  purchasePrice: number;
  rentFromOtherUnit: number | null;
  taxesAnnual: number;
  insuranceAnnual: number;
  monthlyMaintenance: number;
  monthlyPrincipalInterest: number;
  monthlyMortgageInsurance: number;
  cashToClose: number;
};

// Split out from computeHouseHack so a saved quote's investor numbers can
// be re-derived on read (the public one-pager, later) from only the
// figures that are actually stored on the row - none of which depend on
// the calculator's current constants, so an old quote's investor view
// never silently drifts even though it isn't stored directly itself.
export function deriveInvestorMetrics(input: InvestorMetricsInput): InvestorMetrics | null {
  if (input.rentFromOtherUnit == null) return null;

  const totalMonthlyRent = 2 * input.rentFromOtherUnit;
  const annualGrossRent = totalMonthlyRent * 12;
  const annualOperatingExpenses = input.taxesAnnual + input.insuranceAnnual + input.monthlyMaintenance * 12;
  const noi = annualGrossRent - annualOperatingExpenses;
  const capRatePct = (noi / input.purchasePrice) * 100;

  const annualDebtService = (input.monthlyPrincipalInterest + input.monthlyMortgageInsurance) * 12;
  const annualCashFlow = noi - annualDebtService;
  const cashOnCashPct = (annualCashFlow / input.cashToClose) * 100;

  const onePercentRulePct = (totalMonthlyRent / input.purchasePrice) * 100;

  return { capRatePct, cashOnCashPct, onePercentRulePct };
}

export type HouseHackBreakdown = {
  loanAmount: number;
  downPaymentDollars: number;
  monthlyPrincipalInterest: number;
  monthlyTaxesInsurance: number;
  monthlyMortgageInsurance: number;
  monthlyMaintenance: number;
  monthlyRentCredit: number;
  monthlyOutOfPocket: number;
  cashToClose: number;
  bothSidesRentedOutOfPocket: number | null;
  bothSidesRentedDelta: number | null;
  comparisonDelta: number | null;
  investor: InvestorMetrics | null;
};

// Pure, no I/O - same style as lib/crm/commission.ts. The single biggest
// assumption throughout: "if both sides rented" and the investor view
// both assume the primary unit would rent for the same as "the other
// unit" - the calculator only ever collects one rent figure, so that's
// the only number available to build either from.
export function computeHouseHack(inputs: HouseHackInputs): HouseHackBreakdown {
  const { purchasePrice, downPaymentPct, interestRatePct, loanType, rentFromOtherUnit, taxesAnnual, insuranceAnnual, rentingNow } = inputs;

  const downPaymentDollars = (purchasePrice * downPaymentPct) / 100;
  const baseLoanAmount = purchasePrice - downPaymentDollars;
  // FHA's upfront MIP is financed into the loan rather than paid in cash -
  // it never appears as its own cash-to-close line, it just slightly
  // raises the principal (and therefore the P&I payment) instead.
  const loanAmount = loanType === "fha_30" ? baseLoanAmount * (1 + FHA_UFMIP_RATE) : baseLoanAmount;

  const n = loanTermMonths(loanType);
  const r = interestRatePct / 100 / 12;
  const monthlyPrincipalInterest = r === 0 ? loanAmount / n : (loanAmount * r * (1 + r) ** n) / ((1 + r) ** n - 1);

  const monthlyMortgageInsurance =
    loanType === "fha_30"
      ? (loanAmount * (downPaymentPct >= 5 ? FHA_ANNUAL_MIP_STD : FHA_ANNUAL_MIP_LOW_DOWN)) / 12
      : downPaymentPct < 20
        ? (baseLoanAmount * CONVENTIONAL_PMI_RATE) / 12
        : 0;

  const monthlyTaxesInsurance = (taxesAnnual + insuranceAnnual) / 12;
  const monthlyMaintenance = (purchasePrice * MAINTENANCE_RATE_ANNUAL) / 12;
  const monthlyRentCredit = rentFromOtherUnit ?? 0;

  const monthlyOutOfPocket = monthlyPrincipalInterest + monthlyTaxesInsurance + monthlyMortgageInsurance + monthlyMaintenance - monthlyRentCredit;
  const cashToClose = downPaymentDollars + purchasePrice * CLOSING_COST_RATE;

  const bothSidesRentedOutOfPocket =
    rentFromOtherUnit == null ? null : monthlyPrincipalInterest + monthlyTaxesInsurance + monthlyMortgageInsurance + monthlyMaintenance - 2 * rentFromOtherUnit;
  const bothSidesRentedDelta = bothSidesRentedOutOfPocket == null ? null : monthlyOutOfPocket - bothSidesRentedOutOfPocket;

  const investor = deriveInvestorMetrics({
    purchasePrice,
    rentFromOtherUnit,
    taxesAnnual,
    insuranceAnnual,
    monthlyMaintenance,
    monthlyPrincipalInterest,
    monthlyMortgageInsurance,
    cashToClose,
  });

  const comparisonDelta = rentingNow == null ? null : rentingNow - monthlyOutOfPocket;

  return {
    loanAmount,
    downPaymentDollars,
    monthlyPrincipalInterest,
    monthlyTaxesInsurance,
    monthlyMortgageInsurance,
    monthlyMaintenance,
    monthlyRentCredit,
    monthlyOutOfPocket,
    cashToClose,
    bothSidesRentedOutOfPocket,
    bothSidesRentedDelta,
    comparisonDelta,
    investor,
  };
}
