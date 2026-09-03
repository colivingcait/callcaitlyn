import { formatLocal } from "@/lib/format-time";
import { PrepSheetCard } from "@/components/dashboard/PrepSheetCard";
import { WeeklyReviewCard } from "@/components/dashboard/WeeklyReviewCard";
import { UpNextCard } from "@/components/dashboard/mobile/UpNextCard";
import { TodayWorklist, type TodayChipKey } from "@/components/dashboard/mobile/TodayWorklist";
import { TodayFooterLine } from "@/components/dashboard/mobile/TodayFooterLine";
import { TodaySearch } from "@/components/dashboard/mobile/TodaySearch";
import type { getTodayData, WorklistPerson } from "@/lib/data/today";
import type { WeeklyReviewPayload } from "@/lib/data/weekly-review";
import type { PrepSheetPayload } from "@/lib/data/prep-sheet";
import type { TextTemplate } from "@/types/database";

type Today = Awaited<ReturnType<typeof getTodayData>>;
type MergeCandidate = { id: string; first_name: string; last_name: string; phone: string | null; email: string | null };

export function TodayMobile({
  today,
  contacts,
  activePrepSheets,
  pinnedWeeklyReview,
  defaultDraftTemplate,
}: {
  today: Today;
  contacts: MergeCandidate[];
  activePrepSheets: { id: string; payload: unknown }[];
  pinnedWeeklyReview: { id: string; payload: unknown } | null;
  defaultDraftTemplate: TextTemplate | null;
}) {
  const openItems = today.calls.length + today.repliesOwed.length + today.myTasks.length + today.registeredNoFollowUp.length + today.bookingRequests.length;

  const groups: Record<TodayChipKey, WorklistPerson[]> = {
    late: today.calls.filter((c) => c.late),
    dueToday: today.calls.filter((c) => !c.late),
    owed: today.repliesOwed,
    neverTexted: today.newLeadsNeverCalledContacts.map((c) => ({
      id: c.id,
      name: `${c.first_name} ${c.last_name}`.trim(),
      phone: c.phone,
      meta: c.last_event_name ? `Registered · ${c.last_event_name}` : c.lead_source ?? "New lead",
      late: false,
    })),
  };

  // Priority: overdue > due today > owed reply > never texted - the
  // highest-priority non-empty group's first person becomes Up next.
  let upNext: (WorklistPerson & { source: "call" | "reply" }) | null = null;
  let upNextReason = "";
  if (groups.late[0]) {
    upNext = { ...groups.late[0], source: "call" };
    upNextReason = groups.late[0].meta;
  } else if (groups.dueToday[0]) {
    upNext = { ...groups.dueToday[0], source: "call" };
    upNextReason = "Due today";
  } else if (groups.owed[0]) {
    upNext = { ...groups.owed[0], source: "reply" };
    upNextReason = "Owed a reply";
  } else if (groups.neverTexted[0]) {
    upNext = { ...groups.neverTexted[0], source: "call" };
    upNextReason = "Never texted";
  }

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

      <UpNextCard item={upNext} reason={upNextReason} draftTemplate={defaultDraftTemplate} />

      <div className="mt-4">
        <TodayWorklist groups={groups} />
      </div>

      <TodayFooterLine
        totalActive={today.statStrip.totalActive}
        hotCount={today.statStrip.hotCount}
        underContractCount={today.statStrip.underContractCount}
        underContractNet={today.commissionYear.underContractNet}
      />
    </div>
  );
}
