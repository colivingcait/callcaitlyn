import { getCommissionTrend, getCommissionRateTrend, getDealForecast, getCapYearComparison } from "@/lib/data/reports";
import { CommissionTrendReport } from "@/components/reports/CommissionTrendReport";
import { CommissionRateTrendReport } from "@/components/reports/CommissionRateTrendReport";
import { DealForecastReport } from "@/components/reports/DealForecastReport";
import { CapYearComparisonReport } from "@/components/reports/CapYearComparisonReport";

export default async function MoneyReportPage() {
  const [commissionTrend, commissionRateTrend, dealForecast, capYearComparison] = await Promise.all([
    getCommissionTrend(),
    getCommissionRateTrend(),
    getDealForecast(),
    getCapYearComparison(),
  ]);

  return (
    <>
      <CommissionTrendReport months={commissionTrend} />
      <CommissionRateTrendReport months={commissionRateTrend} />
      <DealForecastReport data={dealForecast} />
      <CapYearComparisonReport rows={capYearComparison} />
    </>
  );
}
