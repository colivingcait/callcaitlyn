import Link from "next/link";
import { Calendar, TrendingDown, Eye, Flame, Users, Clock, AlertTriangle, ChevronRight } from "lucide-react";
import { getInsightsData } from "@/lib/data/insights";
import { InsightCard } from "@/components/insights/InsightCard";
import { LeaseRows } from "@/components/insights/LeaseRows";
import { WorklistGroup } from "@/components/dashboard/WorklistGroup";
import { dismissCard } from "@/app/(app)/insights/actions";

export default async function InsightsPage() {
  const data = await getInsightsData();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-[28px]">Insights</h1>
      <p className="mt-1 text-[15px] text-neutral-500">What changed on its own - Today is what you decided to do.</p>

      <div className="mt-5 space-y-3">
        {data.leases.length > 0 && (
          <InsightCard
            icon={Calendar}
            title={`${data.leases.length} lease${data.leases.length === 1 ? "" : "s"} end${data.leases.length === 1 ? "s" : ""} within 90 days`}
            subtitle={data.leases.map((l) => l.name).join(", ")}
          >
            <LeaseRows rows={data.leases} />
          </InsightCard>
        )}

        <InsightCard icon={TrendingDown} title="Rates fell" subtitle="Coming once rate tracking is live." expandable={false} muted />

        {data.warmCount > 0 && (
          <InsightCard
            icon={Eye}
            title={`${data.warmCount} people are paying attention`}
            subtitle="Opens and clicks without a reply"
            expandable={false}
            action={
              <Link href="/insights/warm" className="flex shrink-0 items-center gap-1 rounded-[10px] border border-neutral-200 bg-white px-3.5 py-2 text-sm font-semibold text-neutral-800">
                See them <ChevronRight size={14} />
              </Link>
            }
          />
        )}

        {data.coldHot.length > 0 && (
          <InsightCard
            icon={Flame}
            title={`${data.coldHot.length} Hot / Ready gone quiet 30+ days`}
            subtitle={data.coldHot.map((c) => c.name).join(", ")}
            expandable={false}
            onDismiss={dismissCard.bind(null, "cold_from_hot")}
            action={
              <Link href="/contacts?queue=cold_from_hot" className="flex shrink-0 items-center gap-1 rounded-[10px] border border-neutral-200 bg-white px-3.5 py-2 text-sm font-semibold text-neutral-800">
                See them <ChevronRight size={14} />
              </Link>
            }
          />
        )}

        {data.regularsNeverCalled.length > 0 && (
          <InsightCard
            icon={Users}
            title={`${data.regularsNeverCalled.length} regulars never had a phone call`}
            subtitle="Two or more meetups - your warmest untouched group"
            onDismiss={dismissCard.bind(null, "regulars_never_called")}
          >
            <WorklistGroup people={data.regularsNeverCalled.map((c) => ({ id: c.contactId, name: c.name, phone: c.phone, meta: "2+ meetups, never called", late: false }))} />
          </InsightCard>
        )}

        {data.pastClientsTwoYears.length > 0 && (
          <InsightCard
            icon={Clock}
            title={`${data.pastClientsTwoYears.length} past clients passed two years`}
            subtitle="The point where people start thinking about the next one"
            onDismiss={dismissCard.bind(null, "past_clients_two_years")}
          >
            <WorklistGroup
              people={data.pastClientsTwoYears.map((c) => ({ id: c.contactId, name: c.name, phone: c.phone, meta: `Closed ${c.yearsAgo} year${c.yearsAgo === 1 ? "" : "s"} ago`, late: false }))}
            />
          </InsightCard>
        )}

        {(data.noPhoneCount > 0 || data.duplicatePairs.length > 0) && (
          <InsightCard
            icon={AlertTriangle}
            title="Two data problems worth ten minutes"
            subtitle={[
              data.noPhoneCount > 0 ? `${data.noPhoneCount} with no phone number` : null,
              data.duplicatePairs.length > 0 ? `${data.duplicatePairs.length} possible duplicates` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
            onDismiss={dismissCard.bind(null, "data_problems")}
          >
            <div className="flex flex-wrap items-center gap-2 p-[18px]">
              {data.noPhoneCount > 0 && (
                <Link href="/contacts?phone=0" className="rounded-[10px] border border-neutral-200 bg-white px-3.5 py-2 text-sm font-semibold text-neutral-800">
                  Review the {data.noPhoneCount} with no phone
                </Link>
              )}
              {data.duplicatePairs.length > 0 && (
                <Link href="/contacts?queue=duplicate_risk" className="rounded-[10px] border border-neutral-200 bg-white px-3.5 py-2 text-sm font-semibold text-neutral-800">
                  Review the {data.duplicatePairs.length} duplicates
                </Link>
              )}
            </div>
          </InsightCard>
        )}

        {data.leases.length === 0 &&
          data.warmCount === 0 &&
          data.coldHot.length === 0 &&
          data.regularsNeverCalled.length === 0 &&
          data.pastClientsTwoYears.length === 0 &&
          data.noPhoneCount === 0 &&
          data.duplicatePairs.length === 0 && <p className="text-[15px] text-neutral-400">Nothing worth flagging right now.</p>}
      </div>
    </div>
  );
}
