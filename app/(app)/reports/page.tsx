import {
  getLeadSourceReport,
  getNewLeadsReport,
  getCommissionTrend,
  getDealForecast,
  getContactTypeBreakdown,
  getSpeedToLeadDistribution,
  getSourceTrend,
  getTagSegments,
  getJourneyStageBreakdown,
  getCommissionRateTrend,
  getCapYearComparison,
  getTaskCompletionTrend,
  getStaleLeadsReport,
  getDuplicateRiskPairs,
  getSequenceEngagementReport,
  getMeetupShowRate,
} from "@/lib/data/reports";
import { LeadSourceReport } from "@/components/reports/LeadSourceReport";
import { NewLeadsReport } from "@/components/reports/NewLeadsReport";
import { CommissionTrendReport } from "@/components/reports/CommissionTrendReport";
import { DealForecastReport } from "@/components/reports/DealForecastReport";
import { ContactMixReport } from "@/components/reports/ContactMixReport";
import { SpeedToLeadReport } from "@/components/reports/SpeedToLeadReport";
import { SourceTrendReport } from "@/components/reports/SourceTrendReport";
import { TagSegmentsReport } from "@/components/reports/TagSegmentsReport";
import { JourneyStageReport } from "@/components/reports/JourneyStageReport";
import { CommissionRateTrendReport } from "@/components/reports/CommissionRateTrendReport";
import { CapYearComparisonReport } from "@/components/reports/CapYearComparisonReport";
import { TaskCompletionTrendReport } from "@/components/reports/TaskCompletionTrendReport";
import { StaleLeadsReport } from "@/components/reports/StaleLeadsReport";
import { DuplicateRiskReport } from "@/components/reports/DuplicateRiskReport";
import { SequenceEngagementReport } from "@/components/reports/SequenceEngagementReport";
import { MeetupShowRateReport } from "@/components/reports/MeetupShowRateReport";
import { ReportCategory } from "@/components/reports/ReportCategory";
import type { Period } from "@/lib/data/metrics";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const params = await searchParams;
  const period: Period = params.period === "month" ? "month" : "week";

  const [
    leadSourceRows,
    newLeads,
    commissionTrend,
    dealForecast,
    contactMix,
    speedToLead,
    sourceTrend,
    tagSegments,
    journeyStage,
    commissionRateTrend,
    capYearComparison,
    taskTrend,
    staleLeads,
    duplicatePairs,
    sequenceEngagement,
    showRate,
  ] = await Promise.all([
    getLeadSourceReport(),
    getNewLeadsReport(period),
    getCommissionTrend(),
    getDealForecast(),
    getContactTypeBreakdown(),
    getSpeedToLeadDistribution(period),
    getSourceTrend(),
    getTagSegments(),
    getJourneyStageBreakdown(),
    getCommissionRateTrend(),
    getCapYearComparison(),
    getTaskCompletionTrend(),
    getStaleLeadsReport(),
    getDuplicateRiskPairs(),
    getSequenceEngagementReport(),
    getMeetupShowRate(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-neutral-900">Reports</h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          Where your leads actually come from, which sources turn into closed business, and what&apos;s coming next.
        </p>
      </div>

      <ReportCategory title="Leads">
        <NewLeadsReport data={newLeads} period={period} />
        <SourceTrendReport data={sourceTrend} />
        <MeetupShowRateReport series={showRate} />
        <JourneyStageReport rows={journeyStage} />
        <TagSegmentsReport data={tagSegments} />
        <ContactMixReport rows={contactMix} />
        <div>
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">All-time by lead source</h2>
          <LeadSourceReport rows={leadSourceRows} />
        </div>
      </ReportCategory>

      <ReportCategory title="Money">
        <CommissionTrendReport months={commissionTrend} />
        <CommissionRateTrendReport months={commissionRateTrend} />
        <DealForecastReport data={dealForecast} />
        <CapYearComparisonReport rows={capYearComparison} />
      </ReportCategory>

      <ReportCategory title="Performance">
        <SpeedToLeadReport buckets={speedToLead} period={period} />
        <TaskCompletionTrendReport months={taskTrend} />
        <SequenceEngagementReport rows={sequenceEngagement} />
      </ReportCategory>

      <ReportCategory title="Contacts health">
        <StaleLeadsReport buckets={staleLeads} />
        <DuplicateRiskReport pairs={duplicatePairs} />
      </ReportCategory>
    </div>
  );
}
