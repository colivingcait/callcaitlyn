import Link from "next/link";
import { Bell, CalendarHeart, ChevronRight, DollarSign, KanbanSquare, ListTodo, MessageCircle, Settings } from "lucide-react";
import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { TodaySearch } from "@/components/dashboard/mobile/TodaySearch";
import { TodayPipelineOverview } from "@/components/dashboard/TodayPipelineOverview";
import { TodayQueues } from "@/components/dashboard/TodayQueues";
import { ShowMoreList } from "@/components/ui/ShowMoreList";
import { formatLocal, isTodayLocal, timeOfDayGreeting } from "@/lib/format-time";
import { todayFocusHref } from "@/lib/crm/today-focus";
import { PAPER_CARD } from "@/lib/ui/paper";
import { cn } from "@/lib/utils";
import type { CalendarFeedStatus, getTodayData, TodayCalendarItem, WorklistPerson, WorklistTask } from "@/lib/data/today";
import type { MergeCandidate } from "@/lib/data/contacts";

const CARD = PAPER_CARD;

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
    <Link href={href} data-today-control={control} className={cn("flex h-full min-h-[76px] min-w-0 items-center gap-3 px-3.5 py-3", CARD)}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-neutral-900">{title}</p>
        <p className="mt-0.5 truncate text-[13px] text-neutral-400">{subtitle}</p>
      </div>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#c45c4a] text-white shadow-[0_4px_10px_rgb(196_92_74_/_0.28)]">
        <Icon size={18} strokeWidth={1.7} />
      </span>
    </Link>
  );
}

function EventRow({ item, bordered }: { item: TodayCalendarItem; bordered?: boolean }) {
  return (
    <a
      href={item.href}
      target={item.href.startsWith("http") ? "_blank" : undefined}
      rel={item.href.startsWith("http") ? "noreferrer" : undefined}
      className={cn("flex min-w-0 items-center gap-3.5 px-3.5 py-3.5", bordered && "border-t border-[#eadfd6]/80")}
    >
      <div className="flex h-[52px] w-[46px] shrink-0 flex-col items-center justify-center rounded-[12px] bg-[#f3e4dc] text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#c45c4a]">{formatLocal(item.startsAt, "MMM")}</p>
        <p className="font-serif text-[18px] font-semibold leading-none text-neutral-900">{formatLocal(item.startsAt, "d")}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-neutral-900">{item.title}</p>
        <p className="mt-0.5 truncate text-[13px] text-neutral-400">
          {[item.meta, item.allDay ? null : formatLocal(item.startsAt, "h:mm a")].filter(Boolean).join(" · ")}
        </p>
      </div>
    </a>
  );
}

function UpcomingEvents({
  items,
  pendingCount,
  status,
}: {
  items: TodayCalendarItem[];
  pendingCount: number;
  status: CalendarFeedStatus;
}) {
  const empty =
    status === "disconnected" ? (
      <div className="px-4 py-5">
        <p className="text-[14px] text-neutral-500">Google Calendar isn’t connected, so nothing here is guessed from the CRM.</p>
        <Link href="/settings#gmail" className="mt-2 inline-flex text-[14px] font-semibold text-[#c45c4a]">
          Connect Google in Settings
        </Link>
      </div>
    ) : status === "needs_reconnect" ? (
      <div className="px-4 py-5">
        <p className="text-[14px] text-neutral-500">Google needs to be reconnected before calendar events can show (calendar access was added after Gmail).</p>
        <Link href="/settings#gmail" className="mt-2 inline-flex text-[14px] font-semibold text-[#c45c4a]">
          Reconnect in Settings
        </Link>
      </div>
    ) : (
      <p className="px-4 py-5 text-[14px] text-neutral-400">Nothing on your Google Calendar in the next two weeks.</p>
    );

  return (
    <section data-today-home="events" className="flex h-full min-w-0 flex-col">
      <p className="mb-2.5 px-0.5 text-[15px] font-semibold text-neutral-800">Upcoming Events</p>
      <div className={cn("flex min-w-0 flex-1 flex-col overflow-hidden", CARD)}>
        {items.length === 0 ? (
          empty
        ) : (
          <ShowMoreList
            items={items}
            initial={6}
            renderItem={(item, i) => <EventRow key={item.id} item={item} bordered={i > 0} />}
          />
        )}
        {pendingCount > 0 && (
          <Link href="/scheduling" className="mt-auto flex items-center justify-between border-t border-[#eadfd6]/80 px-3.5 py-3 text-[13px] font-medium text-brand-700">
            {pendingCount} booking{pendingCount === 1 ? "" : "s"} to approve
            <ChevronRight size={16} className="text-neutral-300" />
          </Link>
        )}
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
    <div className="min-w-0 flex-1">
      <h1 className={cn("font-display font-semibold leading-[1.08] tracking-[-0.03em] text-neutral-900", wide ? "text-[clamp(28px,3.2vw,42px)]" : "text-[32px]")}>
        {greeting}, {ownerFirstName || "Caitlyn"}
      </h1>
      <p className="mt-1.5 text-[15px] text-neutral-500">Here&apos;s what&apos;s happening with your pipeline today.</p>
    </div>
  );

  const quickLinks = (
    <div className={cn("grid min-w-0 gap-2.5", wide ? "h-full grid-cols-2 xl:grid-cols-1" : "grid-cols-2")} data-today-home="quick-links">
      <QuickStat href={todayFocusHref("tasks")} icon={ListTodo} title="My Tasks" subtitle={taskSubtitle} control="home-tasks" />
      <QuickStat href="/messages" icon={MessageCircle} title="Messages" subtitle={messageSubtitle} control="home-messages" />
    </div>
  );

  const shortcuts = (
    <div className={cn("min-w-0 overflow-hidden", CARD)} data-today-home="shortcuts">
      <div className={cn(wide && "grid grid-cols-2 sm:grid-cols-5 xl:grid-cols-1")}>
        {SHORTCUTS.map((item, i) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-[52px] min-w-0 items-center gap-3 px-3.5 text-[15px] font-medium text-neutral-800",
              wide
                ? "border-[#eadfd6]/80 sm:border-l xl:border-l-0 xl:border-t first:border-l-0 xl:first:border-t-0"
                : i > 0 && "border-t border-[#eadfd6]/80",
            )}
          >
            <item.icon size={18} strokeWidth={1.7} className="shrink-0 text-neutral-500" />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            <ChevronRight size={16} className="hidden shrink-0 text-neutral-300 xl:block" />
          </Link>
        ))}
      </div>
    </div>
  );

  const queues = (
    <TodayQueues
      wide={wide}
      overdueCount={groups.late.length}
      callTodayCount={groups.dueToday.length}
      newUncontactedCount={groups.newUncontacted.length}
      quietCount={groups.quiet.length}
      messages={groups.owed}
      spamFilteredCount={today.spamFilteredCount}
    />
  );

  if (wide) {
    return (
      <div className="min-w-0 space-y-6 overflow-x-hidden">
        <div className="flex min-w-0 items-start justify-between gap-4">
          {greetingBlock}
          <div className="w-[min(100%,16rem)] shrink-0">
            <TodaySearch contacts={contacts} variant="desktop" />
          </div>
        </div>
        <div className="grid min-w-0 grid-cols-12 gap-5">
          <div className="col-span-12 min-w-0 xl:col-span-8">
            <TodayPipelineOverview stages={today.stages} counts={today.statStrip.stageCounts} size="desktop" />
          </div>
          <div className="col-span-12 min-w-0 xl:col-span-4">{quickLinks}</div>
          <div className="col-span-12 min-w-0 xl:col-span-8">
            <UpcomingEvents items={today.calendar} pendingCount={today.bookingRequests.length} status={today.calendarStatus} />
          </div>
          <div className="col-span-12 min-w-0 xl:col-span-4">{shortcuts}</div>
          <div className="col-span-12 min-w-0">{queues}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
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
      <TodayPipelineOverview stages={today.stages} counts={today.statStrip.stageCounts} />
      {quickLinks}
      <UpcomingEvents items={today.calendar} pendingCount={today.bookingRequests.length} status={today.calendarStatus} />
      {shortcuts}
      {queues}
    </div>
  );
}
