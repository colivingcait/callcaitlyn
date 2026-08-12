import {
  getLeadSourceReport,
  getNewLeadsReport,
  getCommissionTrend,
  getDealForecast,
  getContactTypeBreakdown,
  getSpeedToLeadDistribution,
  getSourceTrend,
} from "@/lib/data/reports";
import { LeadSourceReport } from "@/components/reports/LeadSourceReport";
import { NewLeadsReport } from "@/components/reports/NewLeadsReport";
import { CommissionTrendReport } from "@/components/reports/CommissionTrendReport";
import { DealForecastReport } from "@/components/reports/DealForecastReport";
import { ContactMixReport } from "@/components/reports/ContactMixReport";
import { SpeedToLeadReport } from "@/components/reports/SpeedToLeadReport";
import { SourceTrendReport } from "@/components/reports/SourceTrendReport";
import type { Period } from "@/lib/data/metrics";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const params = await searchParams;
  const period: Period = params.period === "month" ? "month" : "week";

  const [rows, newLeads, commissionTrend, dealForecast, contactMix, speedToLead, sourceTrend] = await Promise.all([
    getLeadSourceReport(),
    getNewLeadsReport(period),
    getCommissionTrend(),
    getDealForecast(),
    getContactTypeBreakdown(),
    getSpeedToLeadDistribution(period),
    getSourceTrend(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-neutral-900">Reports</h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          Where your leads actually come from, which sources turn into closed business, and what&apos;s coming next.
        </p>
      </div>
      <NewLeadsReport data={newLeads} period={period} />
      <CommissionTrendReport months={commissionTrend} />
      <DealForecastReport data={dealForecast} />
      <SpeedToLeadReport buckets={speedToLead} period={period} />
      <SourceTrendReport data={sourceTrend} />
      <ContactMixReport rows={contactMix} />
      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">All-time by lead source</h2>
        <LeadSourceReport rows={rows} />
      </div>
    </div>
  );
}
