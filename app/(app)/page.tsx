import { getTodayData } from "@/lib/data/today";
import { getSuggestionQueue } from "@/lib/data/insights";
import { listMergeCandidates } from "@/lib/data/contacts";
import { getDefaultDraftTemplate } from "@/lib/data/text-templates";
import { createClient } from "@/lib/supabase/server";
import { TodayMobile } from "@/components/dashboard/mobile/TodayMobile";
import { UpNextCard } from "@/components/dashboard/mobile/UpNextCard";
import { formatLocal } from "@/lib/format-time";
import { Section } from "@/components/ui/Section";
import { TodayWorklistDesktop } from "@/components/dashboard/TodayWorklistDesktop";
import { TodayTasksGroup } from "@/components/dashboard/TodayTasksGroup";
import { TodayStatStrip } from "@/components/dashboard/TodayStatStrip";
import { PipelineMiniCard } from "@/components/dashboard/PipelineMiniCard";
import { CommissionMiniCard } from "@/components/dashboard/CommissionMiniCard";
import { NewLeadsSection } from "@/components/dashboard/NewLeadsSection";
import { WeeklyReviewCard } from "@/components/dashboard/WeeklyReviewCard";
import { PrepSheetCard } from "@/components/dashboard/PrepSheetCard";
import { Sparkles, ChevronRight } from "lucide-react";
import Link from "next/link";
import { pickUpNext, countTodayOpenItems } from "@/lib/crm/today-priority";
import { filterResolvedWeeklyReviewItems, type WeeklyReviewPayload } from "@/lib/data/weekly-review";
import type { PrepSheetPayload } from "@/lib/data/prep-sheet";

export default async function TodayPage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    today,
    contacts,
    { data: pinnedWeeklyReview },
    { data: pinnedPrepSheets },
    defaultDraftTemplate,
    suggestionQueue,
  ] = await Promise.all([
    supabase.auth.getUser(),
    getTodayData(),
    listMergeCandidates(),
    supabase.from("pinned_today_items").select("id, payload").eq("kind", "weekly_review").is("cleared_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("pinned_today_items").select("id, payload").eq("kind", "prep_sheet").is("cleared_at", null).order("created_at", { ascending: false }).limit(5),
    getDefaultDraftTemplate(),
    getSuggestionQueue(),
  ]);

  // A prep sheet clears itself once its meeting's start time passes, even
  // if nobody clicked Clear - no cleanup job needed, just don't render a
  // stale one.
  const activePrepSheets = (pinnedPrepSheets ?? []).filter((p) => new Date((p.payload as unknown as PrepSheetPayload).startAt).getTime() > Date.now());

  const ownerId = user?.id ?? "";

  const desktopGroups = {
    late: today.calls.filter((c) => c.late),
    dueToday: today.calls.filter((c) => !c.late),
    owed: today.repliesOwed,
    registered: today.registeredNoFollowUp,
  };
  const { item: upNext, reason: upNextReason } = pickUpNext(desktopGroups);
  const upNextMoreCount = Math.max(
    countTodayOpenItems({
      calls: [...desktopGroups.late, ...desktopGroups.dueToday],
      repliesOwed: desktopGroups.owed,
      myTasks: [],
      newLeads: [],
      registeredNoFollowUp: [],
      bookingRequests: [],
    }) - (upNext ? 1 : 0),
    0,
  );

  const openItems = countTodayOpenItems(today);

  // The stored payload is a snapshot from whenever the weekly-review cron
  // last ran - it never gets rewritten just because a row was fixed, so
  // re-check each actionable row's real current state on every load
  // instead of trusting the stale snapshot (see filterResolvedWeeklyReviewItems).
  const resolvedWeeklyReview = pinnedWeeklyReview
    ? { id: pinnedWeeklyReview.id, payload: await filterResolvedWeeklyReviewItems(supabase, ownerId, pinnedWeeklyReview.payload as unknown as WeeklyReviewPayload) }
    : null;

  return (
    <>
      <TodayMobile
        today={today}
        contacts={contacts}
        ownerId={ownerId}
        activePrepSheets={activePrepSheets}
        pinnedWeeklyReview={resolvedWeeklyReview}
        defaultDraftTemplate={defaultDraftTemplate}
      />
      <div className="mx-auto hidden max-w-3xl px-4 py-6 md:block">
      <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-[28px]">{formatLocal(new Date(), "EEEE, MMMM d")}</h1>
      <p className="mt-1 text-[15px] text-neutral-500">{openItems} people to work today</p>

      {activePrepSheets.length > 0 && (
        <div className="mt-4 space-y-3">
          {activePrepSheets.map((p) => (
            <PrepSheetCard key={p.id} id={p.id} payload={p.payload as unknown as PrepSheetPayload} />
          ))}
        </div>
      )}

      {resolvedWeeklyReview && (
        <div className="mt-4">
          <WeeklyReviewCard id={resolvedWeeklyReview.id} payload={resolvedWeeklyReview.payload} />
        </div>
      )}

      <div className="mt-4">
        <TodayStatStrip
          totalActive={today.statStrip.totalActive}
          newLeadsWeek={today.statStrip.newLeadsWeek}
          hotCount={today.statStrip.hotCount}
          underContractCount={today.statStrip.underContractCount}
          callsToday={today.statStrip.callsToday}
        />
      </div>

      {today.newLeadsError && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Couldn&apos;t load new leads: {today.newLeadsError}
        </p>
      )}
      {today.newLeads.length > 0 && (
        <div className="mt-4">
          <NewLeadsSection contacts={today.newLeads} layout="desktop" defaultDraftTemplate={defaultDraftTemplate} />
        </div>
      )}

      <div className="mt-5">
        <UpNextCard item={upNext} reason={upNextReason} draftTemplate={defaultDraftTemplate} moreCount={upNextMoreCount} />
      </div>

      <div className="mt-5">
        <TodayWorklistDesktop groups={desktopGroups} bookingRequests={today.bookingRequests} />
      </div>

      {suggestionQueue.count > 0 && (
        <Link href="/insights" className="mt-3 flex items-center gap-3 rounded-2xl border border-[#ebe9e7] bg-white px-[18px] py-3.5">
          <Sparkles size={18} className="shrink-0 text-neutral-400" />
          <p className="min-w-0 flex-1 text-[15px] text-neutral-700">
            <span className="font-semibold text-neutral-900">{suggestionQueue.count}</span> {suggestionQueue.count === 1 ? "person" : "people"} said something
            worth acting on — read them together in Insights
          </p>
          <ChevronRight size={17} className="shrink-0 text-neutral-400" />
        </Link>
      )}

      <div className="mt-3">
        <Section sectionKey="today:tasks" title="My tasks" meta={`${today.myTasks.length}`}>
          <TodayTasksGroup tasks={today.myTasks} ownerId={ownerId} contacts={contacts} />
        </Section>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <PipelineMiniCard stages={today.stages} counts={today.statStrip.stageCounts} />
        <CommissionMiniCard
          netCommission={today.commissionYear.netCommission}
          underContractNet={today.commissionYear.underContractNet}
          kwCapLeft={today.commissionYear.kwCapLeft}
          kwCapUsedPct={today.commissionYear.kwCapUsedPct}
        />
      </div>
      </div>
    </>
  );
}
