import Link from "next/link";
import { Clock, Phone, UserPlus, Bell, ChevronRight, MessageCircle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { todayFocusHref } from "@/lib/crm/today-focus";
import { inboxHref } from "@/lib/crm/inbox-href";
import { PAPER_CARD } from "@/lib/ui/paper";
import { ShowMoreList } from "@/components/ui/ShowMoreList";
import type { WorklistPerson } from "@/lib/data/today";

const CARD = PAPER_CARD;
const BADGE = "flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[13px] font-semibold";
const LABEL = "mb-2.5 px-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7a5c50]";

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
      className={cn("flex min-h-[58px] min-w-0 items-center gap-3 rounded-[16px] px-3.5 py-3.5", CARD)}
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
}: {
  overdueCount: number;
  callTodayCount: number;
  newUncontactedCount: number;
  quietCount: number;
  messages: WorklistPerson[];
  spamFilteredCount?: number;
  wide?: boolean;
}) {
  const owedCount = messages.length;

  const doNext = (
    <section className="min-w-0">
      <p className={LABEL}>Do next</p>
      <div className={wide ? "grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" : "space-y-2"}>
        <QueueRow href={todayFocusHref("overdue")} icon={Clock} label="Overdue" count={overdueCount} accent control="queue-overdue" />
        <QueueRow href={todayFocusHref("call-today")} icon={Phone} label="Call today" count={callTodayCount} control="queue-call-today" />
        <QueueRow href={todayFocusHref("new")} icon={UserPlus} label="New / uncontacted" count={newUncontactedCount} control="queue-new" />
        <QueueRow href={todayFocusHref("quiet")} icon={Bell} label="Quiet 14+ days" count={quietCount} control="queue-quiet" />
      </div>
    </section>
  );

  const inbox = (
    <section className="min-w-0">
      <p className={LABEL}>Messages</p>
      <Link
        href="/messages"
        data-today-control="messages"
        className="block min-w-0 overflow-hidden rounded-[16px] border border-[#f0e4df] bg-[#fdf6f3] px-3.5 py-3.5 shadow-card"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#c45c4a] text-white shadow-[0_4px_10px_rgb(196_92_74_/_0.28)]">
            <MessageCircle size={18} strokeWidth={1.6} fill="currentColor" />
          </div>
          <p className={cn("min-w-0 flex-1 font-serif text-[18px] font-semibold", owedCount > 0 ? "text-[#c45c4a]" : "text-neutral-700")}>
            {owedCount === 0 ? "Inbox is clear" : `${owedCount} unread thread${owedCount === 1 ? "" : "s"}`}
          </p>
          <ChevronRight size={18} strokeWidth={1.75} className="shrink-0 text-neutral-300" />
        </div>
      </Link>
      {owedCount > 0 && (
        <div className={cn("mt-2 min-w-0 overflow-hidden", CARD)}>
          <ShowMoreList
            items={messages}
            initial={wide ? 4 : 2}
            renderItem={(m) => (
              <Link key={m.id} href={`/messages/${m.id}`} className="block truncate border-t border-[#eadfd6]/80 px-3.5 py-2.5 first:border-t-0">
                <span className="text-[14px] font-medium text-neutral-800">{m.name}</span>
                {m.meta ? <span className="text-[13px] text-neutral-400">{` · ${m.meta}`}</span> : null}
              </Link>
            )}
          />
        </div>
      )}
      {spamFilteredCount > 0 && (
        <Link
          href={inboxHref({ spam: true })}
          data-today-control="spam-filtered"
          className="mt-2 flex min-h-11 items-center gap-2 px-1 text-[13px] text-neutral-400"
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
      <div className="relative min-w-0 space-y-6">
        {doNext}
        {inbox}
      </div>
    );
  }

  return (
    <div className="relative space-y-6">
      {doNext}
      {inbox}
    </div>
  );
}
