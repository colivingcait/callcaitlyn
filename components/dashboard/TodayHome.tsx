import type { ReactNode } from "react";
import Link from "next/link";
import { Bell, CalendarHeart, ChevronRight, DollarSign, KanbanSquare, ListTodo, MessageCircle, Settings } from "lucide-react";
import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { TodaySearch } from "@/components/dashboard/mobile/TodaySearch";
import { TodayPipelineOverview } from "@/components/dashboard/TodayPipelineOverview";
import { TodayQueues } from "@/components/dashboard/TodayQueues";
import { TODAY_CARD, TODAY_GRID, TODAY_STACK_DESKTOP, TODAY_STACK_MOBILE } from "@/components/dashboard/today-home-layout";
import { formatLocal, isTodayLocal, timeOfDayGreeting } from "@/lib/format-time";
import { todayFocusHref } from "@/lib/crm/today-focus";
import { cn } from "@/lib/utils";
import type { getTodayData, TodayCalendarItem, WorklistPerson, WorklistTask } from "@/lib/data/today";
import type { MergeCandidate } from "@/lib/data/contacts";

const SHORTCUTS = [
  { href: todayFocusHref("tasks"), label: "Tasks", icon: ListTodo },
  { href: "/pipeline", label: "Deals", icon: KanbanSquare },
  { href: "/events", label: "Events", icon: CalendarHeart },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/commissions", label: "Commissions", icon: DollarSign },
];

function tasksDueToday(tasks: WorklistTask[]) {
  return tasks.filter((t) => t.late || (t.dueAt && isTodayLocal(t.dueAt))).length;
}

function QuickStat({
  href,
  icon: Icon,
  title,
  subtitle,
  control,
}: {
  href: string;
  icon: typeof ListTodo;
  title: string;
  subtitle: string;
  control: string;
}) {
  return (
    <Link href={href} data-today-control={control} className={cn("flex h-full min-h-[76px] items-center gap-3 px-3.5 py-3", TODAY_CARD)}>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-neutral-900">{title}</p>
        <p className="mt-0.5 text-[13px] text-neutral-400">{subtitle}</p>
      </div>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#c45c4a] text-white shadow-[0_4px_10px_rgb(196_92_74_/_0.28)]">
        <Icon size={18} strokeWidth={1.7} />
      </span>
    </Link>
  );
}

function UpcomingEvents({ items, pendingCount }: { items: TodayCalendarItem[]; pendingCount: number }) {
  return (
    <section data-today-home="events" className="h-full min-w-0">
      <div className={cn("flex h-full flex-col overflow-hidden", TODAY_CARD)}>
        <p className="px-4 pt-4 text-[13px] font-semibold text-neutral-800 sm:px-5 sm:pt-5">Upcoming Events</p>
        <div className="mt-1 flex-1">
          {items.length === 0 && pendingCount === 0 ? (
            <Link href="/events" className="block px-4 py-4 text-[14px] text-neutral-400 sm:px-5">
              Nothing on the calendar. Open Events
            </Link>
          ) : (
            items.map((item, i) => (
              <Link
                key={item.id}
                href={item.href}
                className={cn("flex items-center gap-3.5 px-3.5 py-3.5", i > 0 && "border-t border-[#eadfd6]/80")}
              >
                <div className="flex h-[52px] w-[46px] shrink-0 flex-col items-center justify-center rounded-[12px] bg-[#f3e4dc] text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#c45c4a]">{formatLocal(item.startsAt, "MMM")}</p>
                  <p className="font-serif text-[18px] font-semibold leading-none text-neutral-900">{formatLocal(item.startsAt, "d")}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-neutral-900">{item.title}</p>
                  <p className="mt-0.5 truncate text-[13px] text-neutral-400">
                    {[item.meta, formatLocal(item.startsAt, "h:mm a")].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </Link>
            ))
          )}
          {pendingCount > 0 && (
            <Link href="/scheduling" className="flex items-center justify-between border-t border-[#eadfd6]/80 px-3.5 py-3 text-[13px] font-medium text-brand-700">
              {pendingCount} booking{pendingCount === 1 ? "" : "s"} to approve
              <ChevronRight size={16} className="text-neutral-300" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

export function TodayHome({
  today,
  contacts,
  ownerFirstName,
  groups,
  wide = false,
}: {
  today: Awaited<ReturnType<typeof getTodayData>>;
  contacts: MergeCandidate[];
  ownerFirstName: string;
  groups: Record<"late" | "dueToday" | "owed" | "registered" | "newUncontacted" | "quiet", WorklistPerson[]>;
  wide?: boolean;
}) {
  const greeting = timeOfDayGreeting();
  const dueToday = tasksDueToday(today.myTasks);
  const unread = groups.owed.length;
  const taskSubtitle = dueToday > 0 ? `${dueToday} due today` : today.myTasks.length > 0 ? `${today.myTasks.length} open` : "Nothing due";
  const messageSubtitle = unread > 0 ? `${unread} unread` : "Inbox is clear";

  const greetingBlock = (
    <div className="min-w-0">
      <h1 className={cn("font-display font-semibold leading-[1.08] tracking-[-0.03em] text-neutral-900", wide ? "text-[42px]" : "text-[32px]")}>
        {greeting}, {ownerFirstName || "Caitlyn"}
      </h1>
      <p className="mt-1.5 text-[15px] text-neutral-500">Here&apos;s what&apos;s happening with your pipeline today.</p>
    </div>
  );

  const quickLinks = (
    <div className={cn(wide ? TODAY_GRID : "grid grid-cols-2 gap-2.5")} data-today-home="quick-links">
      <div className={wide ? "col-span-6 min-w-0" : undefined}>
        <QuickStat href={todayFocusHref("tasks")} icon={ListTodo} title="My Tasks" subtitle={taskSubtitle} control="home-tasks" />
      </div>
      <div className={wide ? "col-span-6 min-w-0" : undefined}>
        <QuickStat href="/messages" icon={MessageCircle} title="Messages" subtitle={messageSubtitle} control="home-messages" />
      </div>
    </div>
  );

  const shortcuts = (
    <div
      className={cn("overflow-hidden", TODAY_CARD, wide && "grid grid-cols-5 divide-x divide-[#eadfd6]/80")}
      data-today-home="shortcuts"
    >
      {SHORTCUTS.map((item, i) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex min-h-[52px] items-center gap-3 px-3.5 text-[15px] font-medium text-neutral-800",
            !wide && i > 0 && "border-t border-[#eadfd6]/80",
            wide && "min-h-[72px] flex-col justify-center gap-1.5 px-2 text-center text-[13px]",
          )}
        >
          <item.icon size={18} strokeWidth={1.7} className="text-neutral-500" />
          <span className={cn("flex-1", wide && "flex-none truncate")}>{item.label}</span>
          {!wide && <ChevronRight size={16} className="text-neutral-300" />}
        </Link>
      ))}
    </div>
  );

  const queues = (
    <TodayQueues
      wide={wide}
      afterDoNext={quickLinks}
      overdueCount={groups.late.length}
      callTodayCount={groups.dueToday.length}
      newUncontactedCount={groups.newUncontacted.length}
      quietCount={groups.quiet.length}
      messages={groups.owed}
      spamFilteredCount={today.spamFilteredCount}
    />
  );

  // PR #9 fills this with <NewUncontactedSpotlight /> when New/uncontacted is non-empty.
  // Slot sits under the greeting and above Pipeline/Events — do not move it.
  const newSpotlight: ReactNode = null;

  if (wide) {
    return (
      <div className={TODAY_STACK_DESKTOP}>
        <div className="flex items-start justify-between gap-6">
          {greetingBlock}
          <TodaySearch contacts={contacts} variant="desktop" />
        </div>
        <div data-today-home="spotlight" className="contents">
          {newSpotlight}
        </div>
        <div className={TODAY_GRID}>
          <div className="col-span-12 min-w-0 xl:col-span-6">
            <TodayPipelineOverview stages={today.stages} counts={today.statStrip.stageCounts} size="desktop" />
          </div>
          <div className="col-span-12 min-w-0 xl:col-span-6">
            <UpcomingEvents items={today.calendar} pendingCount={today.bookingRequests.length} />
          </div>
        </div>
        {queues}
        {shortcuts}
      </div>
    );
  }

  return (
    <div className={TODAY_STACK_MOBILE}>
      <div className="flex items-center justify-between gap-3">
        <BrandWordmark />
        <div className="flex items-center gap-1.5">
          <TodaySearch contacts={contacts} />
          <Link
            href="/insights"
            aria-label="Insights"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#eadfd6] bg-[#fffbf8] text-neutral-500 shadow-card"
          >
            <Bell size={18} />
          </Link>
        </div>
      </div>
      {greetingBlock}
      <div data-today-home="spotlight" className="contents">
        {newSpotlight}
      </div>
      <TodayPipelineOverview stages={today.stages} counts={today.statStrip.stageCounts} />
      <UpcomingEvents items={today.calendar} pendingCount={today.bookingRequests.length} />
      {queues}
      {shortcuts}
    </div>
  );
}
