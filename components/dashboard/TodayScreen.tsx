import { formatLocal, timeOfDayGreeting, APP_MARKET } from "@/lib/format-time";
import { PrepSheetCard } from "@/components/dashboard/PrepSheetCard";
import { WeeklyReviewCard } from "@/components/dashboard/WeeklyReviewCard";
import { TodaySearch } from "@/components/dashboard/mobile/TodaySearch";
import { TodayQueues } from "@/components/dashboard/TodayQueues";
import { TodayQueuePanel } from "@/components/dashboard/TodayQueuePanel";
import { buildTodayPersonGroups, parseTodayFocus } from "@/lib/crm/today-focus";
import type { getTodayData } from "@/lib/data/today";
import type { WeeklyReviewPayload } from "@/lib/data/weekly-review";
import type { PrepSheetPayload } from "@/lib/data/prep-sheet";
import type { MergeCandidate } from "@/lib/data/contacts";

type Today = Awaited<ReturnType<typeof getTodayData>>;

export function TodayScreen({
  today,
  contacts,
  ownerId,
  ownerFirstName,
  activePrepSheets,
  pinnedWeeklyReview,
  focus,
}: {
  today: Today;
  contacts: MergeCandidate[];
  ownerId: string;
  ownerFirstName: string;
  activePrepSheets: { id: string; payload: unknown }[];
  pinnedWeeklyReview: { id: string; payload: WeeklyReviewPayload } | null;
  focus?: string;
}) {
  const groups = buildTodayPersonGroups(today);
  const parsedFocus = parseTodayFocus(focus);
  const greeting = timeOfDayGreeting();
  const headline = ownerFirstName ? `${greeting}, ${ownerFirstName}` : greeting;

  return (
    <div className="min-h-full bg-[#f7f1ea] px-5 py-6 md:mx-auto md:max-w-lg md:px-6 md:py-8">
      {!parsedFocus && (
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-serif text-[32px] font-semibold leading-9 tracking-[-0.02em] text-neutral-900">{headline}</h1>
            <p className="mt-1.5 text-[15px] text-neutral-500">
              {formatLocal(new Date(), "EEEE")} · {APP_MARKET}
            </p>
          </div>
          <TodaySearch contacts={contacts} />
        </div>
      )}

      {!parsedFocus && activePrepSheets.length > 0 && (
        <div className="mb-5 space-y-3">
          {activePrepSheets.map((p) => (
            <PrepSheetCard key={p.id} id={p.id} payload={p.payload as unknown as PrepSheetPayload} />
          ))}
        </div>
      )}

      {!parsedFocus && pinnedWeeklyReview && (
        <div className="mb-5">
          <WeeklyReviewCard id={pinnedWeeklyReview.id} payload={pinnedWeeklyReview.payload} />
        </div>
      )}

      {today.newLeadsError && !parsedFocus && (
        <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Couldn&apos;t load new leads: {today.newLeadsError}
        </p>
      )}

      {parsedFocus ? (
        <TodayQueuePanel
          key={parsedFocus}
          focus={parsedFocus}
          groups={groups}
          tasks={today.myTasks}
          ownerId={ownerId}
          contacts={contacts}
          bookingRequests={today.bookingRequests}
          newLeadsError={today.newLeadsError}
        />
      ) : (
        <TodayQueues
          overdueCount={groups.late.length}
          callTodayCount={groups.dueToday.length}
          newUncontactedCount={groups.newUncontacted.length}
          quietCount={groups.quiet.length}
          messages={groups.owed}
        />
      )}
    </div>
  );
}
