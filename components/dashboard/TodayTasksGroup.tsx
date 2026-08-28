"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Check, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatLocal } from "@/lib/format-time";
import { cn } from "@/lib/utils";
import type { WorklistTask } from "@/lib/data/today";
import type { MergeCandidate } from "@/lib/data/contacts";

const CAP = 10;

// Today's task list needs one thing the contact-page TaskList doesn't: a
// contact picker on add (defaulting to "No contact"), since these tasks
// span every contact, not one. Same row visual language (pencil/trash) as
// TaskList, kept as its own component rather than a shared abstraction -
// the two lists differ enough (cross-contact display, no implicit
// contactId) that forcing one component through both would need as many
// branches as just writing two.
export function TodayTasksGroup({ tasks, ownerId, contacts }: { tasks: WorklistTask[]; ownerId: string; contacts: MergeCandidate[] }) {
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [contactId, setContactId] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDueAt, setEditDueAt] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const visible = showAll ? tasks : tasks.slice(0, CAP);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("tasks").insert({
      owner_id: ownerId,
      contact_id: contactId || null,
      title: title.trim(),
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
    });
    setTitle("");
    setDueAt("");
    setContactId("");
    setSaving(false);
    setAdding(false);
    router.refresh();
  }

  async function toggleComplete(task: WorklistTask) {
    const supabase = createClient();
    await supabase.from("tasks").update({ completed_at: new Date().toISOString() }).eq("id", task.id);
    router.refresh();
  }

  function startEdit(task: WorklistTask) {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditDueAt(task.dueAt ? task.dueAt.slice(0, 10) : "");
  }

  async function saveEdit(taskId: string) {
    if (!editTitle.trim()) return;
    const supabase = createClient();
    await supabase
      .from("tasks")
      .update({ title: editTitle.trim(), due_at: editDueAt ? new Date(editDueAt).toISOString() : null })
      .eq("id", taskId);
    setEditingId(null);
    router.refresh();
  }

  async function deleteTask(taskId: string) {
    const supabase = createClient();
    await supabase.from("tasks").delete().eq("id", taskId);
    setConfirmingDeleteId(null);
    router.refresh();
  }

  return (
    <div>
      {tasks.length === 0 && !adding && <p className="px-4 py-6 text-[15px] text-neutral-400">No open tasks.</p>}

      {visible.map((task) => (
        <div key={task.id} className="border-b border-neutral-100 px-4 py-3.5 last:border-b-0">
          {editingId === task.id ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                autoFocus
                className="min-w-0 flex-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[15px] text-neutral-900"
              />
              <input
                type="date"
                value={editDueAt}
                onChange={(e) => setEditDueAt(e.target.value)}
                className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-sm text-neutral-700"
              />
              <button onClick={() => saveEdit(task.id)} className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white">
                Save
              </button>
              <button onClick={() => setEditingId(null)} className="rounded-lg px-2.5 py-1.5 text-sm text-neutral-500">
                Cancel
              </button>
            </div>
          ) : confirmingDeleteId === task.id ? (
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-[15px] text-neutral-600">Delete &ldquo;{task.title}&rdquo;?</p>
              <button onClick={() => deleteTask(task.id)} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white">
                Delete
              </button>
              <button onClick={() => setConfirmingDeleteId(null)} className="rounded-lg px-2.5 py-1.5 text-sm text-neutral-500">
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3.5">
              <button
                type="button"
                onClick={() => toggleComplete(task)}
                className="flex h-[21px] w-[21px] shrink-0 items-center justify-center rounded-full border border-neutral-300"
              >
                <Check size={13} className="opacity-0" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium text-neutral-900">{task.title}</p>
                <p className={cn("truncate text-sm", task.late ? "font-medium text-[#b91c1c]" : "text-neutral-500")}>
                  {[
                    task.dueAt ? `Due ${formatLocal(task.dueAt, "MMM d")}` : null,
                    task.contactName ? (
                      <Link key="c" href={`/contacts/${task.contactId}`} className="underline">
                        {task.contactName}
                      </Link>
                    ) : (
                      "No contact"
                    ),
                  ]
                    .filter(Boolean)
                    .reduce<React.ReactNode[]>((acc, node, i) => (i === 0 ? [node as React.ReactNode] : [...acc, " · ", node as React.ReactNode]), [])}
                </p>
              </div>
              <button onClick={() => startEdit(task)} className="shrink-0 rounded-[10px] border border-neutral-200 bg-white p-2 text-neutral-500">
                <Pencil size={14} />
              </button>
              <button onClick={() => setConfirmingDeleteId(task.id)} className="shrink-0 rounded-[10px] border border-neutral-200 bg-white p-2 text-red-600">
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
      ))}

      {!showAll && tasks.length > CAP && (
        <button type="button" onClick={() => setShowAll(true)} className="w-full px-4 py-3.5 text-left text-[15px] font-semibold text-neutral-500">
          Show the rest ({tasks.length - CAP} more)
        </button>
      )}

      <div className="p-4">
        {adding ? (
          <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-2">
            <input
              placeholder="Task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="min-w-0 flex-1 rounded-[10px] border border-neutral-200 px-3 py-2 text-[15px] text-neutral-900"
            />
            <select
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              className="rounded-[10px] border border-neutral-200 px-3 py-2 text-sm text-neutral-700"
            >
              <option value="">No contact</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {[c.first_name, c.last_name].filter(Boolean).join(" ")}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="rounded-[10px] border border-neutral-200 px-3 py-2 text-sm text-neutral-700"
            />
            <button type="submit" disabled={saving || !title.trim()} className="rounded-[10px] bg-neutral-900 px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? "Saving…" : "Add"}
            </button>
            <button type="button" onClick={() => setAdding(false)} className="rounded-[10px] px-2.5 py-2 text-sm text-neutral-500">
              Cancel
            </button>
          </form>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-2 text-[15px] font-medium text-neutral-500">
            <Plus size={16} /> Add a task
          </button>
        )}
      </div>
    </div>
  );
}
