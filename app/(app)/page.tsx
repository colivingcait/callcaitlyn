import { getDashboardData } from "@/lib/data/dashboard";
import { StatTile } from "@/components/dashboard/StatTile";
import { FollowUpList } from "@/components/dashboard/FollowUpList";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { StageBreakdown } from "@/components/dashboard/StageBreakdown";
import { isPast, isToday } from "date-fns";

export default async function DashboardPage() {
  const { stages, stageCounts, totalActive, followUps, activities } = await getDashboardData();

  const overdueCount = followUps.filter(
    (c) => c.next_follow_up_at && isPast(new Date(c.next_follow_up_at)) && !isToday(new Date(c.next_follow_up_at)),
  ).length;
  const todayCount = followUps.filter((c) => c.next_follow_up_at && isToday(new Date(c.next_follow_up_at))).length;
  const hotCount = stages.find((s) => s.name.toLowerCase().includes("hot"))
    ? stageCounts.get(stages.find((s) => s.name.toLowerCase().includes("hot"))!.id) ?? 0
    : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-xl font-semibold text-neutral-900">Dashboard</h1>
      <p className="mt-0.5 text-sm text-neutral-500">Here&apos;s what needs your attention today.</p>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Active Leads" value={totalActive} />
        <StatTile label="Hot / Ready" value={hotCount} tone="good" />
        <StatTile label="Due Today" value={todayCount} tone="warning" />
        <StatTile label="Overdue" value={overdueCount} tone="critical" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">Needs follow-up</h2>
          <FollowUpList items={followUps as never} />

          <h2 className="mb-3 mt-8 text-sm font-semibold text-neutral-700">Recent activity</h2>
          <ActivityFeed items={activities} />
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">Pipeline snapshot</h2>
          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <StageBreakdown stages={stages} counts={stageCounts} />
          </div>
        </div>
      </div>
    </div>
  );
}
