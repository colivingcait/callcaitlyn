import { formatLocal, timeOfDayGreeting } from "@/lib/format-time";
import { PrepSheetCard } from "@/components/dashboard/PrepSheetCard";
import { WeeklyReviewCard } from "@/components/dashboard/WeeklyReviewCard";
import { UpNextCard } from "@/components/dashboard/mobile/UpNextCard";
import { TodayWorklist } from "@/components/dashboard/mobile/TodayWorklist";
import { TodayFooterLine } from "@/components/dashboard/mobile/TodayFooterLine";
import { TodaySearch } from "@/components/dashboard/mobile/TodaySearch";
import { TodayQueues } from "@/components/dashboard/TodayQueues";
import { pickUpNext, countTodayOpenItems } from "@/lib/crm/today-priority";
import type { getTodayData, WorklistPerson } from "@/lib/data/today";
import type { WeeklyReviewPayload } from "@/lib/data/weekly-review";
import type { PrepSheetPayload } from "@/lib/data/prep-sheet";
import type { TextTemplate } from "@/types/database";
import type { TodayChipKey } from "@/components/dashboard/mobile/TodayWorklist";

type Today = Awaited<ReturnType<typeof getTodayData>>;
type MergeCandidate = { id: string; first_name: string; last_name: string; phone: string | null; email: string | null };

const FOCUS_TO_CHIP: Record<string, TodayChipKey> = {
  overdue: "late",
  "call-today": "dueToday",
  new: "newUncontacted",
  quiet: "quiet",
  messages: "owed",
  tasks: "tasks",
  registered: "registered",
  meetings: "meetings",
};

export function TodayMobile({
  today,
  contacts,
  ownerId,
  ownerFirstName,
  activePrepSheets,
  pinnedWeeklyReview,
  defaultDraftTemplate,
  focus,
}: {
  today: Today;
  contacts: MergeCandidate[];
  ownerId: string;
  ownerFirstName: string;
  activePrepSheets: { id: string; payload: unknown }[];
  pinnedWeeklyReview: { id: string; payload: unknown } | null;
  defaultDraftTemplate: TextTemplate | null;
  focus?: string;
}) {
  const newUncontacted: WorklistPerson[] = today.newLeads.map((c) => ({
    id: c.id,
    name: `${c.first_name} ${c.last_name}`.trim(),
    phone: c.phone,
    meta: c.lead_source ? `New · ${c.lead_source}` : "New / uncontacted",
    late: false,
  }));

  const groups: Record<"late" | "dueToday" | "owed" | "registered" | "newUncontacted" | "quiet", WorklistPerson[]> = {
    late: today.calls.filter((c) => c.late),
    dueToday: today.calls.filter((c) => !c.late),
    owed: today.repliesOwed,
    registered: today.registeredNoFollowUp,
    newUncontacted,
    quiet: today.quietLeads,
  };

  const openItems = countTodayOpenItems(today);
  const { item: upNext, reason: upNextReason } = pickUpNext(groups);
  const greeting = timeOfDayGreeting();
  const headline = ownerFirstName ? `${greeting}, ${ownerFirstName}` : greeting;
  const initialChip = focus ? FOCUS_TO_CHIP[focus] : undefined;

  return (
    <div className="px-4 py-5 md:hidden">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-serif text-[28px] font-semibold leading-8 text-neutral-900">{headline}</p>
          <p className="mt-1 text-[15px] text-neutral-500">
            {formatLocal(new Date(), "EEEE")}
            {openItems > 0 ? ` · ${openItems} to work` : ""}
          </p>
          <p className="mt-0.5 text-[13px] text-neutral-400">Morning loop. People in Contacts · texts in Messages · deals in Pipeline.</p>
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

      <TodayQueues
        overdueCount={groups.late.length}
        callTodayCount={groups.dueToday.length}
        newUncontactedCount={groups.newUncontacted.length}
        quietCount={groups.quiet.length}
        messages={groups.owed}
        underContractCount={today.statStrip.underContractCount}
        taskCount={today.myTasks.length}
        focus={focus}
      />

      <div className="mt-4">
        <UpNextCard item={upNext} reason={upNextReason} draftTemplate={defaultDraftTemplate} />
      </div>

      <div className="mt-4">
        <TodayWorklist
          groups={groups}
          tasks={today.myTasks}
          ownerId={ownerId}
          contacts={contacts}
          bookingRequests={today.bookingRequests}
          initialChip={initialChip}
        />
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
