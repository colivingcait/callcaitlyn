import type { ReactNode } from "react";
import Link from "next/link";
import { Clock, Phone, UserPlus, Bell, ChevronRight, MessageCircle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { todayFocusHref } from "@/lib/crm/today-focus";
import { inboxHref } from "@/lib/crm/inbox-href";
import { TODAY_CARD, TODAY_GRID, TODAY_LABEL, TODAY_SECTION } from "@/components/dashboard/today-home-layout";
import type { WorklistPerson } from "@/lib/data/today";

const BADGE = "flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[13px] font-semibold";

function QueueRow({
  href,
  icon: Icon,
  label,
  count,
  accent,
  control,
}: {
  href: string;
  icon: typeof Clock;
  label: string;
  count: number;
  accent?: boolean;
  control: string;
}) {
  return (
    <Link
      href={href}
      data-today-control={control}
      className={cn("flex h-full min-h-[58px] min-w-0 items-center gap-3 px-3.5 py-3.5", TODAY_CARD)}
    >
      <Icon size={20} strokeWidth={1.7} className={cn("shrink-0", accent || count > 0 ? "text-[#c45c4a]" : "text-neutral-500")} />
      <p className="min-w-0 flex-1 truncate text-[16px] text-neutral-900">
        {label}
        <span className="text-neutral-400"> · {count}</span>
      </p>
      <span className={cn(BADGE, count > 0 ? "bg-[#c45c4a] text-white" : "bg-[#f0e4df] text-neutral-500")}>{count}</span>
      <ChevronRight size={18} strokeWidth={1.75} className="shrink-0 text-neutral-300" />
    </Link>
  );
}

export function TodayQueues({
  overdueCount,
  callTodayCount,
  newUncontactedCount,
  quietCount,
  messages,
  spamFilteredCount = 0,
  wide = false,
  afterDoNext,
}: {
  overdueCount: number;
  callTodayCount: number;
  newUncontactedCount: number;
  quietCount: number;
  messages: WorklistPerson[];
  spamFilteredCount?: number;
  wide?: boolean;
  afterDoNext?: ReactNode;
}) {
  const owedCount = messages.length;

  const doNext = (
    <section className={TODAY_SECTION} data-today-home="do-next">
      <p className={TODAY_LABEL}>Do next</p>
      <div className={wide ? "grid grid-cols-3 gap-6" : "grid grid-cols-1 gap-2.5"}>
        <QueueRow href={todayFocusHref("overdue")} icon={Clock} label="Overdue" count={overdueCount} accent control="queue-overdue" />
        <QueueRow href={todayFocusHref("call-today")} icon={Phone} label="Call today" count={callTodayCount} control="queue-call-today" />
        <QueueRow href={todayFocusHref("new")} icon={UserPlus} label="New / uncontacted" count={newUncontactedCount} control="queue-new" />
      </div>
    </section>
  );

  const quiet = (
    <section className={TODAY_SECTION}>
      <p className={TODAY_LABEL}>Quiet leads</p>
      <QueueRow href={todayFocusHref("quiet")} icon={Bell} label="No touch 14+ days" count={quietCount} control="queue-quiet" />
    </section>
  );

  const inbox = (
    <section className={TODAY_SECTION}>
      <p className={TODAY_LABEL}>Messages</p>
      <Link
        href="/messages"
        data-today-control="messages"
        className={cn("block px-3.5 py-3.5", TODAY_CARD)}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#c45c4a] text-white shadow-[0_4px_10px_rgb(196_92_74_/_0.28)]">
            <MessageCircle size={18} strokeWidth={1.6} fill="currentColor" />
          </div>
          <p className={cn("min-w-0 flex-1 font-serif text-[18px] font-semibold", owedCount > 0 ? "text-[#c45c4a]" : "text-neutral-700")}>
            {owedCount === 0 ? "Inbox is clear" : `${owedCount} unread thread${owedCount === 1 ? "" : "s"}`}
          </p>
          <ChevronRight size={18} strokeWidth={1.75} className="shrink-0 text-neutral-300" />
        </div>
        {messages.slice(0, wide ? 5 : 2).map((m) => (
          <p key={m.id} className="mt-1 truncate pl-[52px] text-[14px] text-neutral-500">
            <span className="text-neutral-800">{m.name}</span>
            {m.meta ? ` · ${m.meta}` : ""}
          </p>
        ))}
      </Link>
      {spamFilteredCount > 0 && (
        <Link
          href={inboxHref({ spam: true })}
          data-today-control="spam-filtered"
          className="flex min-h-11 items-center gap-2 px-1 text-[13px] text-neutral-400"
        >
          <ShieldAlert size={14} className="shrink-0" />
          Spam filtered · {spamFilteredCount}
          <ChevronRight size={14} className="ml-auto shrink-0 text-neutral-300" />
        </Link>
      )}
    </section>
  );

  if (wide) {
    return (
      <>
        {doNext}
        {afterDoNext}
        <div className={cn(TODAY_GRID, "items-start")}>
          <div className="col-span-12 min-w-0 xl:col-span-6">{quiet}</div>
          <div className="col-span-12 min-w-0 xl:col-span-6">{inbox}</div>
        </div>
      </>
    );
  }

  return (
    <>
      {doNext}
      {afterDoNext}
      {quiet}
      {inbox}
    </>
  );
}
