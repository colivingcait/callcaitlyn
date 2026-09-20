"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, ListTodo, X } from "lucide-react";
import { createEventFollowUpTask } from "@/app/(app)/events/actions";
import {
  defaultFollowUpTitle,
  followUpAudienceLabel,
  followUpDueChipLabel,
  followUpDueDateInput,
  FOLLOWUP_NOTES_MAX,
  type EventFollowUpAudience,
} from "@/lib/crm/event-followup";
import { dateInputToAppIso } from "@/lib/format-time";
import { cn } from "@/lib/utils";

const AUDIENCE_OPTIONS: EventFollowUpAudience[] = ["checked_in", "no_show", "registered", "first_timers", "all"];

export function FollowUpTaskDrawer({
  eventKey,
  eventLabel,
  hasEnded,
  audienceCounts,
  peopleByAudience,
  initialAudience,
  onClose,
}: {
  eventKey: string;
  eventLabel: string;
  hasEnded: boolean;
  audienceCounts: Record<EventFollowUpAudience, number>;
  peopleByAudience: Record<EventFollowUpAudience, string[]>;
  initialAudience: EventFollowUpAudience;
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(defaultFollowUpTitle(eventLabel));
  const [audience, setAudience] = useState<EventFollowUpAudience>(initialAudience);
  const [dueAt, setDueAt] = useState(followUpDueDateInput());
  const [showOnToday, setShowOnToday] = useState(true);
  const [actionDoNext, setActionDoNext] = useState(true);
  const [actionText, setActionText] = useState(true);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const contactIds = peopleByAudience[audience] ?? [];
  const dueIso = useMemo(() => (dueAt ? dateInputToAppIso(dueAt) : ""), [dueAt]);

  async function save() {
    if (!title.trim() || contactIds.length === 0) return;
    setSaving(true);
    setError("");
    const result = await createEventFollowUpTask({
      eventKey,
      eventLabel,
      title: title.trim(),
      notes,
      dueAt,
      audience,
      contactIds,
      showOnToday,
      actionText,
      actionDoNext,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/25" role="dialog" aria-modal="true" aria-labelledby="follow-up-task-title">
      <button type="button" aria-label="Close" className="absolute inset-0 cursor-default" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-[420px] flex-col border-l border-[#eadfd6] bg-[#fffdfb] shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-[#eadfd6] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <ListTodo size={18} className="text-[#c45c4a]" />
            <h2 id="follow-up-task-title" className="font-display text-[22px] font-semibold tracking-[-0.02em] text-neutral-900">
              Create follow-up task
            </h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-neutral-400 hover:bg-[#f3e4dc]/70" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[.08em] text-neutral-400">Task title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 h-12 w-full rounded-xl border border-[#eadfd6] bg-white px-3.5 text-[15px] text-neutral-900 outline-none focus:border-[#c45c4a]/40 focus:ring-2 focus:ring-[#c45c4a]/15"
            />
          </label>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-neutral-400">Audience</p>
            <div className="mt-1.5 space-y-2">
              {AUDIENCE_OPTIONS.filter((value) => value !== "no_show" || hasEnded).map((value) => {
                const count = audienceCounts[value];
                const selected = audience === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAudience(value)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-[14px]",
                      selected ? "border-[#c45c4a] bg-[#c45c4a]/5 text-neutral-900" : "border-[#eadfd6] bg-white text-neutral-600",
                    )}
                  >
                    <span>{followUpAudienceLabel(value, count)}</span>
                    {selected && <Check size={16} className="text-[#c45c4a]" />}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[.08em] text-neutral-400">Due date</span>
            <div className="relative mt-1.5">
              <CalendarDays size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="h-12 w-full rounded-xl border border-[#eadfd6] bg-white px-3.5 pr-10 text-[15px] text-neutral-900 outline-none focus:border-[#c45c4a]/40"
              />
            </div>
            {dueIso && <p className="mt-1.5 text-[13px] text-neutral-500">{followUpDueChipLabel(dueIso)}</p>}
          </label>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-neutral-400">Priority &amp; action</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <ActionChip label="Today" selected={showOnToday} onClick={() => setShowOnToday((v) => !v)} />
              <ActionChip label="Do Next" selected={actionDoNext} onClick={() => setActionDoNext((v) => !v)} />
              <ActionChip label="Text" selected={actionText} onClick={() => setActionText((v) => !v)} />
            </div>
          </div>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[.08em] text-neutral-400">Add notes about this follow-up…</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, FOLLOWUP_NOTES_MAX))}
              rows={4}
              className="mt-1.5 min-h-[96px] w-full resize-none rounded-xl border border-[#eadfd6] bg-white px-3.5 py-3 text-[14px] leading-6 text-neutral-800 outline-none focus:border-[#c45c4a]/40"
            />
            <p className="mt-1 text-right text-[12px] text-neutral-400">
              {notes.length}/{FOLLOWUP_NOTES_MAX}
            </p>
          </label>

          {error && <p className="text-[13px] text-red-600">{error}</p>}
        </div>

        <div className="border-t border-[#eadfd6] px-5 py-4">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !title.trim() || contactIds.length === 0}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#c45c4a] text-[15px] font-semibold text-white disabled:opacity-50"
          >
            <Check size={16} /> {saving ? "Saving…" : "Save task"}
          </button>
          <p className="mt-3 text-center text-[13px] text-neutral-400">This task will appear in your Tasks list on Today as Text &amp; Next.</p>
        </div>
      </aside>
    </div>
  );
}

function ActionChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-[13px] font-semibold",
        selected ? "bg-[#c45c4a] text-white" : "border border-[#eadfd6] bg-white text-neutral-600",
      )}
    >
      {label}
    </button>
  );
}
