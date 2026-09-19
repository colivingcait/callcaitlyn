import { TodaySearch } from "@/components/dashboard/mobile/TodaySearch";
import { TodayPipelineOverview } from "@/components/dashboard/TodayPipelineOverview";
import { TextAndNextDialer } from "@/components/dashboard/TextAndNextDialer";
import { TodayUpcomingEvents } from "@/components/dashboard/TodayUpcomingEvents";
import { TodayTodosCard } from "@/components/dashboard/TodayTodosCard";
import { TODAY_GRID, TODAY_STACK_DESKTOP, TODAY_STACK_MOBILE } from "@/components/dashboard/today-home-layout";
import { timeOfDayGreeting } from "@/lib/format-time";
import { buildTextAndNextLeads, openTasksForToday } from "@/lib/crm/today-v1";
import { cn } from "@/lib/utils";
import type { getTodayData } from "@/lib/data/today";
import type { MergeCandidate } from "@/lib/data/contacts";

export function TodayHome({
  today,
  contacts,
  ownerFirstName,
  wide = false,
}: {
  today: Awaited<ReturnType<typeof getTodayData>>;
  contacts: MergeCandidate[];
  ownerFirstName: string;
  wide?: boolean;
}) {
  const greeting = timeOfDayGreeting();
  const leads = buildTextAndNextLeads(today.newLeads);
  const upcoming = today.upcomingCrmEvents.slice(0, 2);
  const tasks = openTasksForToday(today.myTasks);

  const greetingBlock = (
    <div className="min-w-0">
      <h1 className={cn("font-display font-semibold leading-[1.08] tracking-[-0.03em] text-neutral-900", wide ? "text-[42px]" : "text-[28px]")}>
        {greeting}, {ownerFirstName || "Caitlyn"}
      </h1>
      <p className={cn("text-neutral-500", wide ? "mt-1.5 text-[15px]" : "mt-1 text-[14px]")}>Here&apos;s who needs you today.</p>
    </div>
  );

  const dialer = (
    <div data-today-home="spotlight" className="contents">
      <TextAndNextDialer leads={leads} />
    </div>
  );

  const pipeline = (
    <TodayPipelineOverview stages={today.stages} counts={today.statStrip.stageCounts} size={wide ? "desktop" : "phone"} />
  );

  const events = upcoming.length > 0 ? <TodayUpcomingEvents items={upcoming} /> : null;
  const todos = <TodayTodosCard tasks={tasks} />;

  if (wide) {
    return (
      <div className={TODAY_STACK_DESKTOP}>
        <div className="flex items-start justify-between gap-6">
          {greetingBlock}
          <TodaySearch contacts={contacts} variant="desktop" />
        </div>
        {today.newLeadsError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Couldn&apos;t load new leads: {today.newLeadsError}
          </p>
        )}
        {dialer}
        <div className={TODAY_GRID}>
          <div className={cn("min-w-0", events ? "col-span-12 xl:col-span-6" : "col-span-12")}>{pipeline}</div>
          {events && <div className="col-span-12 min-w-0 xl:col-span-6">{events}</div>}
        </div>
        {todos}
      </div>
    );
  }

  return (
    <div className={TODAY_STACK_MOBILE}>
      <div className="flex items-start justify-between gap-3">
        {greetingBlock}
        <TodaySearch contacts={contacts} />
      </div>
      {today.newLeadsError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Couldn&apos;t load new leads: {today.newLeadsError}
        </p>
      )}
      {dialer}
      {pipeline}
      {events}
      {todos}
    </div>
  );
}
