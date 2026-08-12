import {
  getSpeedToLeadDistribution,
  getFollowUpRateTrend,
  getLeadEngagementBreakdown,
  getSequenceEngagementReport,
  getTaskCompletionTrend,
} from "@/lib/data/reports";
import { SpeedToLeadReport } from "@/components/reports/SpeedToLeadReport";
import { FollowUpRateTrendReport } from "@/components/reports/FollowUpRateTrendReport";
import { LeadEngagementReport } from "@/components/reports/LeadEngagementReport";
import { SequenceEngagementReport } from "@/components/reports/SequenceEngagementReport";
import { TaskCompletionTrendReport } from "@/components/reports/TaskCompletionTrendReport";
import type { Period } from "@/lib/data/metrics";

export default async function PerformanceReportPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const params = await searchParams;
  const period: Period = params.period === "month" ? "month" : "week";

  const [speedToLead, followUpTrend, leadEngagement, sequenceEngagement, taskTrend] = await Promise.all([
    getSpeedToLeadDistribution(period),
    getFollowUpRateTrend(),
    getLeadEngagementBreakdown(),
    getSequenceEngagementReport(),
    getTaskCompletionTrend(),
  ]);

  return (
    <>
      <SpeedToLeadReport buckets={speedToLead} period={period} />
      <FollowUpRateTrendReport months={followUpTrend} />
      <LeadEngagementReport buckets={leadEngagement} />
      <SequenceEngagementReport rows={sequenceEngagement} />
      <TaskCompletionTrendReport months={taskTrend} />
    </>
  );
}
