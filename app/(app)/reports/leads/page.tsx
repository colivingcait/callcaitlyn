import {
  getLeadSourceReport,
  getNewLeadsReport,
  getContactTypeBreakdown,
  getSourceTrend,
  getTagSegments,
  getJourneyStageBreakdown,
  getStageDistribution,
  getStaleLeadsReport,
  getDuplicateRiskPairs,
} from "@/lib/data/reports";
import { LeadSourceReport } from "@/components/reports/LeadSourceReport";
import { NewLeadsReport } from "@/components/reports/NewLeadsReport";
import { ContactMixReport } from "@/components/reports/ContactMixReport";
import { SourceTrendReport } from "@/components/reports/SourceTrendReport";
import { TagSegmentsReport } from "@/components/reports/TagSegmentsReport";
import { JourneyStageReport } from "@/components/reports/JourneyStageReport";
import { StageDistributionReport } from "@/components/reports/StageDistributionReport";
import { StaleLeadsReport } from "@/components/reports/StaleLeadsReport";
import { DuplicateRiskReport } from "@/components/reports/DuplicateRiskReport";
import type { Period } from "@/lib/data/metrics";

export default async function LeadsReportPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const params = await searchParams;
  const period: Period = params.period === "month" ? "month" : "week";

  const [leadSourceRows, newLeads, contactMix, sourceTrend, tagSegments, journeyStage, stageDistribution, staleLeads, duplicatePairs] =
    await Promise.all([
      getLeadSourceReport(),
      getNewLeadsReport(period),
      getContactTypeBreakdown(),
      getSourceTrend(),
      getTagSegments(),
      getJourneyStageBreakdown(),
      getStageDistribution(),
      getStaleLeadsReport(),
      getDuplicateRiskPairs(),
    ]);

  return (
    <>
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
    </>
  );
}
