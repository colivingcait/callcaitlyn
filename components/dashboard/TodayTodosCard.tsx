"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ListTodo, Mail, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cadenceDueLabel, taskDueLabel, type EventCadenceDue } from "@/lib/crm/today-v1";
import { TODAY_CARD } from "@/components/dashboard/today-home-layout";
import { TextBlastModal } from "@/components/contacts/TextBlastModal";
import { cn } from "@/lib/utils";
import type { WorklistTask } from "@/lib/data/today";
import type { BlastTarget } from "@/app/(app)/contacts/text-blast-actions";

export function TodayTodosCard({ tasks, cadenceDues }: { tasks: WorklistTask[]; cadenceDues: EventCadenceDue[] }) {
  const router = useRouter();
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [textTarget, setTextTarget] = useState<BlastTarget | null>(null);
  const visibleTasks = tasks.filter((task) => !doneIds.has(task.id));
  const empty = cadenceDues.length === 0 && visibleTasks.length === 0;

  async function toggleComplete(task: WorklistTask) {
    setError("");
    const supabase = createClient();
    const { error: updateError } = await supabase.from("tasks").update({ completed_at: new Date().toISOString() }).eq("id", task.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDoneIds((prev) => new Set(prev).add(task.id));
    router.refresh();
  }

  return (
    <section data-today-home="todos" className={cn("overflow-hidden", TODAY_CARD)}>
      <div className="flex items-center gap-2 px-4 pt-4 sm:px-5">
        <ListTodo size={16} strokeWidth={1.7} className="text-[#c45c4a]" />
        <h2 className="text-[15px] font-semibold text-neutral-900">To Dos</h2>
      </div>
      {error && <p className="px-5 pt-2 text-[13px] text-red-600">{error}</p>}
      {empty ? (
        <p className="px-4 py-5 text-[14px] text-neutral-400 sm:px-5">Nothing on the list right now.</p>
      ) : (
        <ul className="mt-1">
          {cadenceDues.map((row, i) => (
            <li
              key={row.id}
              className={cn("flex items-center gap-3 px-4 py-3.5 sm:px-5", i > 0 && "border-t border-[#eadfd6]/80")}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#f3e4dc] text-[#c45c4a]">
                {row.action === "email" ? <Mail size={16} strokeWidth={1.7} /> : <MessageCircle size={16} strokeWidth={1.7} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-neutral-500">{row.title}</p>
                <p className="truncate text-[15px] font-semibold text-neutral-900">{row.eventName}</p>
                <p className="truncate text-[13px] text-neutral-400">{row.audienceLabel}</p>
              </div>
              <span className="shrink-0 text-[13px] font-medium text-[#c45c4a]">{cadenceDueLabel(row.dueAt)}</span>
              {row.action === "text" ? (
                <button
                  type="button"
                  data-today-control="todo-text"
                  onClick={() => setTextTarget({ kind: "contacts", contactIds: row.contactIds, label: `${row.eventName} · ${row.audienceLabel}` })}
                  className="inline-flex h-9 shrink-0 items-center rounded-xl bg-[#c45c4a] px-3 text-[13px] font-semibold text-white"
                >
                  Text
                </button>
              ) : (
                <Link
                  href="/sequences"
                  data-today-control="todo-email"
                  className="inline-flex h-9 shrink-0 items-center rounded-xl bg-[#c45c4a] px-3 text-[13px] font-semibold text-white"
                >
                  Email
                </Link>
              )}
            </li>
          ))}
          {visibleTasks.map((task, i) => {
            const due = taskDueLabel(task.dueAt);
            return (
              <li
                key={task.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5 sm:px-5",
                  (cadenceDues.length > 0 || i > 0) && "border-t border-[#eadfd6]/80",
                )}
              >
                <button
                  type="button"
                  onClick={() => void toggleComplete(task)}
                  aria-label={`Complete ${task.title}`}
                  className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border border-neutral-300 bg-white"
                >
                  <Check size={12} className="opacity-0" />
                </button>
                <p className="min-w-0 flex-1 truncate text-[15px] text-neutral-800">{task.title}</p>
                {due && <span className="shrink-0 text-[13px] font-medium text-[#c45c4a]">{due === "Today" ? "Due today" : due}</span>}
              </li>
            );
          })}
        </ul>
      )}
      {textTarget && <TextBlastModal target={textTarget} onClose={() => setTextTarget(null)} />}
    </section>
  );
}
