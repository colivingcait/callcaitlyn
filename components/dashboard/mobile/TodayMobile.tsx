import { formatLocal } from "@/lib/format-time";
import { PrepSheetCard } from "@/components/dashboard/PrepSheetCard";
import { WeeklyReviewCard } from "@/components/dashboard/WeeklyReviewCard";
import { UpNextCard } from "@/components/dashboard/mobile/UpNextCard";
import { TodayWorklist } from "@/components/dashboard/mobile/TodayWorklist";
import { TodayFooterLine } from "@/components/dashboard/mobile/TodayFooterLine";
import { TodaySearch } from "@/components/dashboard/mobile/TodaySearch";
import { NewLeadsSection } from "@/components/dashboard/NewLeadsSection";
import { pickUpNext, countTodayOpenItems } from "@/lib/crm/today-priority";
import type { getTodayData, WorklistPerson } from "@/lib/data/today";
import type { WeeklyReviewPayload } from "@/lib/data/weekly-review";
import type { PrepSheetPayload } from "@/lib/data/prep-sheet";
import type { TextTemplate } from "@/types/database";

type Today = Awaited<ReturnType<typeof getTodayData>>;
type MergeCandidate = { id: string; first_name: string; last_name: string; phone: string | null; email: string | null };

export function TodayMobile({
  today,
  contacts,
  ownerId,
  activePrepSheets,
  pinnedWeeklyReview,
  defaultDraftTemplate,
}: {
  today: Today;
  contacts: MergeCandidate[];
  ownerId: string;
  activePrepSheets: { id: string; payload: unknown }[];
  pinnedWeeklyReview: { id: string; payload: unknown } | null;
  defaultDraftTemplate: TextTemplate | null;
}) {
  const groups: Record<"late" | "dueToday" | "owed" | "registered", WorklistPerson[]> = {
    late: today.calls.filter((c) => c.late),
    dueToday: today.calls.filter((c) => !c.late),
    owed: today.repliesOwed,
    registered: today.registeredNoFollowUp,
  };

  const openItems = countTodayOpenItems(today);

  // Priority: overdue > due today > owed reply - the highest-priority
  // non-empty group's first person becomes Up next. New Leads has its own
  // top-of-page stack now, so it no longer feeds into this.
  const { item: upNext, reason: upNextReason } = pickUpNext(groups);

  return (
    <div className="px-4 py-5 md:hidden">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold uppercase tracking-[.05em] text-neutral-400">{formatLocal(new Date(), "EEEE, MMMM d")}</p>
          <p className="mt-0.5 font-serif text-2xl font-semibold text-neutral-900">{openItems} to work</p>
        </div>
        <TodaySearch contacts={contacts} />
      </div>

      {activePrepSheets.length > 0 && (
        <div className="mb-3 space-y-3">
          {activePrepSheets.map((p) => (
            <PrepSheetCard key={p.id} id={p.id} payload={p.payload as unknown as PrepSheetPayload} />
          ))}
        </div>
      )}

      {pinnedWeeklyReview && (
        <div className="mb-3">
          <WeeklyReviewCard id={pinnedWeeklyReview.id} payload={pinnedWeeklyReview.payload as unknown as WeeklyReviewPayload} />
        </div>
      )}

      {today.newLeadsError && (
        <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Couldn&apos;t load new leads: {today.newLeadsError}
        </p>
      )}
      {today.newLeads.length > 0 && (
        <div className="mb-3">
          <NewLeadsSection contacts={today.newLeads} layout="mobile" defaultDraftTemplate={defaultDraftTemplate} />
        </div>
      )}

      <UpNextCard item={upNext} reason={upNextReason} draftTemplate={defaultDraftTemplate} />

      <div className="mt-4">
        <TodayWorklist groups={groups} tasks={today.myTasks} ownerId={ownerId} contacts={contacts} bookingRequests={today.bookingRequests} />
      </div>

      <TodayFooterLine
        totalActive={today.statStrip.totalActive}
        hotCount={today.statStrip.hotCount}
        underContractCount={today.statStrip.underContractCount}
        underContractNet={today.commissionYear.underContractNet}
        callsToday={today.statStrip.callsToday}
      />
    </div>
  );
}
