import { getDashboardData } from "@/lib/data/dashboard";
import { getMetrics, type Period } from "@/lib/data/metrics";
import { createClient } from "@/lib/supabase/server";
import { StatTile } from "@/components/dashboard/StatTile";
import { FollowUpList } from "@/components/dashboard/FollowUpList";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { StageBreakdown } from "@/components/dashboard/StageBreakdown";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PeriodToggle } from "@/components/dashboard/PeriodToggle";
import { Card } from "@/components/ui";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const period: Period = params.period === "month" ? "month" : "week";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ stages, stageCounts, totalActive, followUps, activities, newLeadsWeek, newLeadsMonth }, metrics] =
    await Promise.all([getDashboardData(), getMetrics(period)]);

  const hotCount = stages.find((s) => s.name.toLowerCase().includes("hot"))
    ? stageCounts.get(stages.find((s) => s.name.toLowerCase().includes("hot"))!.id) ?? 0
    : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="font-serif text-2xl font-semibold text-neutral-900">Dashboard</h1>
      <p className="mt-0.5 text-sm text-neutral-500">Here&apos;s what needs your attention today.</p>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Active Leads" value={totalActive} />
        <StatTile label="Hot / Ready" value={hotCount} tone="good" />
        <StatTile label="New Leads (Week)" value={newLeadsWeek} tone="warning" />
        <StatTile label="New Leads (Month)" value={newLeadsMonth} tone="good" />
      </div>

      {user && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-700">Accountability</h2>
            <PeriodToggle period={period} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard
              label="Speed to lead"
              result={metrics.speedToLead}
              kind="hours"
              ownerId={user.id}
              metricKey="speed_to_lead"
            />
            <MetricCard
              label="Contacted"
              result={metrics.contactedPct}
              kind="percent"
              ownerId={user.id}
              metricKey="contacted_pct"
            />
            <MetricCard
              label="Follow-up rate"
              result={metrics.followUpRate}
              kind="percent"
              ownerId={user.id}
              metricKey="follow_up_rate"
            />
            <MetricCard
              label="Conversion rate"
              result={metrics.conversionRate}
              kind="percent"
              ownerId={user.id}
              metricKey="conversion_rate"
            />
          </div>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">Needs follow-up</h2>
          <FollowUpList items={followUps as never} />

          <h2 className="mb-3 mt-8 text-sm font-semibold text-neutral-700">Recent activity</h2>
          <ActivityFeed items={activities} />
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">Pipeline snapshot</h2>
          <Card>
            <StageBreakdown stages={stages} counts={stageCounts} />
          </Card>
        </div>
      </div>
    </div>
  );
}
