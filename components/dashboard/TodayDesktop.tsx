import { formatLocal, timeOfDayGreeting, APP_MARKET } from "@/lib/format-time";
import { PrepSheetCard } from "@/components/dashboard/PrepSheetCard";
import { WeeklyReviewCard } from "@/components/dashboard/WeeklyReviewCard";
import { TodaySearch } from "@/components/dashboard/mobile/TodaySearch";
import { TodayQueues } from "@/components/dashboard/TodayQueues";
import { TodayQueuePanel } from "@/components/dashboard/TodayQueuePanel";
import { buildTodayPersonGroups, parseTodayFocus, type TodayChipKey } from "@/lib/crm/today-focus";
import type { getTodayData } from "@/lib/data/today";
import type { WeeklyReviewPayload } from "@/lib/data/weekly-review";
import type { PrepSheetPayload } from "@/lib/data/prep-sheet";
import type { MergeCandidate } from "@/lib/data/contacts";

type Today = Awaited<ReturnType<typeof getTodayData>>;

export function TodayDesktop({
  today,
  contacts,
  ownerId,
  ownerFirstName,
  activePrepSheets,
  pinnedWeeklyReview,
  focus,
  initialChip,
}: {
  today: Today;
  contacts: MergeCandidate[];
  ownerId: string;
  ownerFirstName: string;
  activePrepSheets: { id: string; payload: unknown }[];
  pinnedWeeklyReview: { id: string; payload: WeeklyReviewPayload } | null;
  focus?: string;
  initialChip?: TodayChipKey;
}) {
  const groups = buildTodayPersonGroups(today);
  const parsedFocus = parseTodayFocus(focus);
  const greeting = timeOfDayGreeting();

  return (
    <div className="mx-auto w-full max-w-[1400px] px-8 py-8">
      {!parsedFocus && (
        <div className="mb-8 flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className="font-display text-[42px] font-semibold leading-[1.08] tracking-[-0.03em] text-neutral-900">
              <span className="font-medium italic text-neutral-800">{greeting},</span>
              {ownerFirstName ? ` ${ownerFirstName}` : ""}
            </h1>
            <p className="mt-2 text-[16px] text-neutral-500">
              {formatLocal(new Date(), "EEEE")} · {APP_MARKET}
            </p>
          </div>
          <TodaySearch contacts={contacts} variant="desktop" />
        </div>
      )}

      {!parsedFocus && activePrepSheets.length > 0 && (
        <div className="mb-6 grid gap-3 lg:grid-cols-2">
          {activePrepSheets.map((p) => (
            <PrepSheetCard key={p.id} id={p.id} payload={p.payload as unknown as PrepSheetPayload} />
          ))}
        </div>
      )}

      {!parsedFocus && pinnedWeeklyReview && (
        <div className="mb-6">
          <WeeklyReviewCard id={pinnedWeeklyReview.id} payload={pinnedWeeklyReview.payload} />
        </div>
      )}

      {today.newLeadsError && !parsedFocus && (
        <p className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Couldn&apos;t load new leads: {today.newLeadsError}
        </p>
      )}

      {parsedFocus ? (
        <TodayQueuePanel
          key={parsedFocus}
          focus={parsedFocus}
          initialChip={initialChip}
          groups={groups}
          tasks={today.myTasks}
          ownerId={ownerId}
          contacts={contacts}
          bookingRequests={today.bookingRequests}
          newLeadsError={today.newLeadsError}
        />
      ) : (
        <TodayQueues
          wide
          overdueCount={groups.late.length}
          callTodayCount={groups.dueToday.length}
          newUncontactedCount={groups.newUncontacted.length}
          quietCount={groups.quiet.length}
          messages={groups.owed}
          spamFilteredCount={today.spamFilteredCount}
        />
      )}
    </div>
  );
}
