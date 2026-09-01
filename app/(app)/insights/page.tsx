import Link from "next/link";
import { Calendar, TrendingDown, Eye, Flame, Users, Clock, AlertTriangle, UserPlus, ChevronRight } from "lucide-react";
import { getInsightsData } from "@/lib/data/insights";
import { getRateMoves } from "@/lib/data/rate-moves";
import { InsightCard } from "@/components/insights/InsightCard";
import { LeaseRows } from "@/components/insights/LeaseRows";
import { RateMoveRow } from "@/components/insights/RateMoveRow";
import { WarmPreviewRow } from "@/components/insights/WarmPreviewRow";
import { WorklistGroup } from "@/components/dashboard/WorklistGroup";
import { dismissCard } from "@/app/(app)/insights/actions";
import { formatPercent } from "@/lib/utils";
import { relativeTime } from "@/lib/format-time";

export default async function InsightsPage() {
  const [data, rateMoves] = await Promise.all([getInsightsData(), getRateMoves()]);

  const nothingToFlag =
    data.leases.length === 0 &&
    data.warmCount === 0 &&
    data.coldHot.length === 0 &&
    data.regularsNeverCalled.length === 0 &&
    data.pastClientsTwoYears.length === 0 &&
    data.noPhoneCount === 0 &&
    data.duplicatePairs.length === 0 &&
    data.registeredNoFollowUp.length === 0;

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
            defaultOpen
          >
            <LeaseRows rows={data.leases} />
          </InsightCard>
        )}

        {rateMoves ? (
          <InsightCard
            icon={TrendingDown}
            title={`Rates ${rateMoves.currentRatePct < rateMoves.previousRatePct ? "fell" : "rose"} to ${formatPercent(rateMoves.currentRatePct, 3)}`}
            subtitle={`Down from ${formatPercent(rateMoves.previousRatePct, 3)} · ${rateMoves.moves.length} ${rateMoves.moves.length === 1 ? "person" : "people"} you quoted a payment to ${rateMoves.moves.length === 1 ? "is" : "are"} now looking at a smaller one`}
          >
            {rateMoves.moves.map((move) => (
              <RateMoveRow key={move.quoteId} move={move} phone={move.phone} email={move.email} />
            ))}
            <p className="border-t border-neutral-100 px-4 py-2.5 text-sm text-neutral-400">
              One person at a time, same as review requests. A rate move is a reason to call, not a reason to blast.
            </p>
          </InsightCard>
        ) : (
          <InsightCard icon={TrendingDown} title="Rates" subtitle="Nothing to compare yet - add today's rate in Settings." expandable={false} muted />
        )}

        {data.warmCount > 0 && (
          <InsightCard
            icon={Eye}
            title={`${data.warmCount} ${data.warmCount === 1 ? "person is" : "people are"} paying attention`}
            subtitle="Opened what you sent them more than once this week"
            action={
              <Link href="/insights/warm" className="flex shrink-0 items-center gap-1 rounded-[10px] border border-neutral-200 bg-white px-3.5 py-2 text-sm font-semibold text-neutral-800">
                See all <ChevronRight size={14} />
              </Link>
            }
          >
            {data.warmPreview.map((w) => (
              <WarmPreviewRow
                key={w.contactId}
                name={w.name}
                phone={w.phone}
                signalsThisWeek={w.signalsThisWeek}
                lastEventLabel={w.events[0] ? relativeTime(w.events[0].date) : null}
              />
            ))}
            <p className="border-t border-neutral-100 px-[18px] py-2.5 text-sm text-neutral-400">
              Built from the link clicks your emails already track, plus opens on the calculator pages you send.
            </p>
          </InsightCard>
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

        {data.registeredNoFollowUp.length > 0 && (
          <InsightCard
            icon={UserPlus}
            title={`${data.registeredNoFollowUp.length} registered and haven't heard from you`}
            subtitle="Signed up for an event, no call/text/email since - the widest gap in the funnel right now"
            expandable={false}
            onDismiss={dismissCard.bind(null, "registered_no_followup")}
            action={
              <Link href="/contacts?queue=no_followup_after_registration" className="flex shrink-0 items-center gap-1 rounded-[10px] border border-neutral-200 bg-white px-3.5 py-2 text-sm font-semibold text-neutral-800">
                Text them <ChevronRight size={14} />
              </Link>
            }
          />
        )}

        {nothingToFlag && <p className="text-[15px] text-neutral-400">Nothing worth flagging right now.</p>}
      </div>
    </div>
  );
}
