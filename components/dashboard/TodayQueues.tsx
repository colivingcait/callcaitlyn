import Link from "next/link";
import { Clock, Phone, UserPlus, Bell, ChevronRight, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { todayFocusHref } from "@/lib/crm/today-focus";
import type { WorklistPerson } from "@/lib/data/today";

const CARD = "border border-[#eadfd6] bg-[#fffbf8]";
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
      className={cn("flex min-h-[56px] items-center gap-3 rounded-[14px] px-3.5 py-3", CARD)}
    >
      <Icon size={20} strokeWidth={1.7} className={cn("shrink-0", accent ? "text-[#c45c4a]" : "text-neutral-700")} />
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
}: {
  overdueCount: number;
  callTodayCount: number;
  newUncontactedCount: number;
  quietCount: number;
  messages: WorklistPerson[];
}) {
  const owedCount = messages.length;

  return (
    <div className="space-y-5">
      <section>
        <p className="mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">Do next</p>
        <div className="space-y-2">
          <QueueRow href={todayFocusHref("overdue")} icon={Clock} label="Overdue" count={overdueCount} accent control="queue-overdue" />
          <QueueRow href={todayFocusHref("call-today")} icon={Phone} label="Call today" count={callTodayCount} control="queue-call-today" />
          <QueueRow href={todayFocusHref("new")} icon={UserPlus} label="New / uncontacted" count={newUncontactedCount} control="queue-new" />
        </div>
      </section>

      <section>
        <p className="mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">Quiet leads</p>
        <QueueRow href={todayFocusHref("quiet")} icon={Bell} label="No touch 14+ days" count={quietCount} control="queue-quiet" />
      </section>

      <section>
        <p className="mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">Messages</p>
        <Link href="/messages" data-today-control="messages" className={cn("block rounded-[14px] px-3.5 py-3", CARD)}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#c45c4a] text-white">
              <MessageCircle size={18} strokeWidth={1.6} fill="currentColor" />
            </div>
            <p className={cn("min-w-0 flex-1 text-[16px] font-semibold", owedCount > 0 ? "text-[#c45c4a]" : "text-neutral-700")}>
              {owedCount === 0 ? "Inbox is clear" : `${owedCount} unread thread${owedCount === 1 ? "" : "s"}`}
            </p>
            <ChevronRight size={18} strokeWidth={1.75} className="shrink-0 text-neutral-300" />
          </div>
          {messages.slice(0, 2).map((m) => (
            <p key={m.id} className="mt-1 truncate pl-[52px] text-[14px] text-neutral-500">
              <span className="text-neutral-800">{m.name}</span>
              {m.meta ? ` · ${m.meta}` : ""}
            </p>
          ))}
        </Link>
      </section>
    </div>
  );
}
