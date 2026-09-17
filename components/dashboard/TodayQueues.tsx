import Link from "next/link";
import { Clock, Phone, UserPlus, Bell, ChevronRight, MessageCircle, FileCheck, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorklistPerson } from "@/lib/data/today";

export type TodayFocus = "overdue" | "call-today" | "new" | "quiet" | "messages" | "tasks" | "registered" | "meetings";

function QueueRow({
  href,
  icon: Icon,
  label,
  count,
  danger,
  active,
}: {
  href: string;
  icon: typeof Clock;
  label: string;
  count: number;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-[14px] border bg-white px-3.5 py-3",
        active ? "border-brand-300 bg-brand-50" : "border-[#ebe9e7]",
      )}
    >
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", danger && count > 0 ? "bg-red-50 text-[#b91c1c]" : "bg-brand-50 text-brand-700")}>
        <Icon size={18} strokeWidth={1.8} />
      </div>
      <p className="min-w-0 flex-1 truncate text-[16px] font-medium text-neutral-900">
        {label}
        <span className="text-neutral-400"> · {count}</span>
      </p>
      <span
        className={cn(
          "flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[13px] font-semibold",
          danger && count > 0 ? "bg-[#b91c1c] text-white" : "bg-brand-50 text-brand-700",
        )}
      >
        {count}
      </span>
      <ChevronRight size={18} className="shrink-0 text-neutral-300" />
    </Link>
  );
}

export function TodayQueues({
  overdueCount,
  callTodayCount,
  newUncontactedCount,
  quietCount,
  messages,
  underContractCount = 0,
  taskCount = 0,
  focus,
}: {
  overdueCount: number;
  callTodayCount: number;
  newUncontactedCount: number;
  quietCount: number;
  messages: WorklistPerson[];
  underContractCount?: number;
  taskCount?: number;
  focus?: string;
}) {
  const owedCount = messages.length;

  return (
    <div className="space-y-5">
      <section>
        <p className="mb-2 px-0.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-neutral-400">Do next</p>
        <div className="space-y-2">
          <QueueRow href="/?focus=overdue" icon={Clock} label="Overdue" count={overdueCount} danger active={focus === "overdue"} />
          <QueueRow href="/?focus=call-today" icon={Phone} label="Call today" count={callTodayCount} active={focus === "call-today"} />
          <QueueRow href="/?focus=new" icon={UserPlus} label="New / uncontacted" count={newUncontactedCount} active={focus === "new"} />
          <QueueRow href="/?focus=tasks" icon={ListTodo} label="My tasks" count={taskCount} active={focus === "tasks"} />
        </div>
      </section>

      <section>
        <p className="mb-2 px-0.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-neutral-400">Quiet leads</p>
        <QueueRow href="/?focus=quiet" icon={Bell} label="No touch 14+ days" count={quietCount} active={focus === "quiet"} />
      </section>

      <section>
        <p className="mb-2 px-0.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-neutral-400">Deals</p>
        <QueueRow href="/pipeline" icon={FileCheck} label="Under contract" count={underContractCount} />
      </section>

      <section>
        <p className="mb-2 px-0.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-neutral-400">Messages</p>
        <Link
          href={owedCount > 0 ? "/?focus=messages" : "/messages"}
          className={cn(
            "block rounded-[14px] border bg-white px-3.5 py-3",
            focus === "messages" ? "border-brand-300 bg-brand-50" : "border-[#ebe9e7]",
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <MessageCircle size={18} strokeWidth={1.8} />
            </div>
            <p className="min-w-0 flex-1 text-[16px] font-semibold text-neutral-900">
              {owedCount === 0 ? "Nothing waiting" : `${owedCount} unread thread${owedCount === 1 ? "" : "s"}`}
            </p>
            {owedCount > 0 && (
              <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-[#b91c1c] px-2 text-[13px] font-semibold text-white">
                {owedCount}
              </span>
            )}
            <ChevronRight size={18} className="shrink-0 text-neutral-300" />
          </div>
          {messages.slice(0, 2).map((m) => (
            <p key={m.id} className="mt-2 truncate pl-[52px] text-[14px] text-neutral-500">
              <span className="font-medium text-neutral-800">{m.name}</span>
              {m.meta ? ` · ${m.meta}` : ""}
            </p>
          ))}
        </Link>
      </section>
    </div>
  );
}
