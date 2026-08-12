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
  getStageDistribution,
  getFollowUpRateTrend,
  getLeadEngagementBreakdown,
} from "@/lib/data/reports";
import { getEventsReport } from "@/lib/data/events-report";
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
import { StageDistributionReport } from "@/components/reports/StageDistributionReport";
import { FollowUpRateTrendReport } from "@/components/reports/FollowUpRateTrendReport";
import { LeadEngagementReport } from "@/components/reports/LeadEngagementReport";
import { MeetupShowRateReport } from "@/components/reports/MeetupShowRateReport";
import { EventAttendanceTrendReport } from "@/components/reports/EventAttendanceTrendReport";
import { EventCommunityReport } from "@/components/reports/EventCommunityReport";
import { EventAudienceReport } from "@/components/reports/EventAudienceReport";
import { EventRoiReport } from "@/components/reports/EventRoiReport";
import { EventTopicsReport } from "@/components/reports/EventTopicsReport";
import { EventRosterReport } from "@/components/reports/EventRosterReport";
import { ReportCategory } from "@/components/reports/ReportCategory";
import type { Period } from "@/lib/data/metrics";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const params = await searchParams;
  const period: Period = params.period === "month" ? "month" : "week";

  const [
    leadSourceRows,
    newLeads,
    contactMix,
    sourceTrend,
    tagSegments,
    journeyStage,
    stageDistribution,
    staleLeads,
    duplicatePairs,
    events,
    speedToLead,
    followUpTrend,
    leadEngagement,
    sequenceEngagement,
    taskTrend,
    commissionTrend,
    commissionRateTrend,
    dealForecast,
    capYearComparison,
  ] = await Promise.all([
    getLeadSourceReport(),
    getNewLeadsReport(period),
    getContactTypeBreakdown(),
    getSourceTrend(),
    getTagSegments(),
    getJourneyStageBreakdown(),
    getStageDistribution(),
    getStaleLeadsReport(),
    getDuplicateRiskPairs(),
    getEventsReport(),
    getSpeedToLeadDistribution(period),
    getFollowUpRateTrend(),
    getLeadEngagementBreakdown(),
    getSequenceEngagementReport(),
    getTaskCompletionTrend(),
    getCommissionTrend(),
    getCommissionRateTrend(),
    getDealForecast(),
    getCapYearComparison(),
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
        <StageDistributionReport rows={stageDistribution} />
        <JourneyStageReport rows={journeyStage} />
        <TagSegmentsReport data={tagSegments} />
        <ContactMixReport rows={contactMix} />
        <StaleLeadsReport buckets={staleLeads} />
        <DuplicateRiskReport pairs={duplicatePairs} />
        <div>
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">All-time by lead source</h2>
          <LeadSourceReport rows={leadSourceRows} />
        </div>
      </ReportCategory>

      <ReportCategory title="Events">
        <MeetupShowRateReport series={events.showRate} />
        <EventAttendanceTrendReport series={events.attendanceTrend} />
        <EventCommunityReport
          communitySize={events.communitySize}
          newVsReturning={events.newVsReturning}
          repeatAttendance={events.repeatAttendance}
        />
        <EventAudienceReport contactType={events.audienceContactType} journeyStage={events.audienceJourneyStage} />
        <EventRoiReport rows={events.roi} />
        <EventTopicsReport rows={events.topTopics} />
        <EventRosterReport roster={events.roster} />
      </ReportCategory>

      <ReportCategory title="Performance">
        <SpeedToLeadReport buckets={speedToLead} period={period} />
        <FollowUpRateTrendReport months={followUpTrend} />
        <LeadEngagementReport buckets={leadEngagement} />
        <SequenceEngagementReport rows={sequenceEngagement} />
        <TaskCompletionTrendReport months={taskTrend} />
      </ReportCategory>

      <ReportCategory title="Money">
        <CommissionTrendReport months={commissionTrend} />
        <CommissionRateTrendReport months={commissionRateTrend} />
        <DealForecastReport data={dealForecast} />
        <CapYearComparisonReport rows={capYearComparison} />
      </ReportCategory>
    </div>
  );
}
