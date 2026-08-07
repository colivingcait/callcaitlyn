"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatLocal } from "@/lib/format-time";
import { Button, Input, Select } from "@/components/ui";
import { Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/database";

export function TaskList({ contactId, ownerId, tasks }: { contactId: string; ownerId: string; tasks: Task[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState("medium");
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("tasks").insert({
      owner_id: ownerId,
      contact_id: contactId,
      title: title.trim(),
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      priority,
    });
    setTitle("");
    setDueAt("");
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  async function toggleComplete(task: Task) {
    const supabase = createClient();
    await supabase
      .from("tasks")
      .update({ completed_at: task.completed_at ? null : new Date().toISOString() })
      .eq("id", task.id);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div key={task.id} className="flex items-center gap-3 rounded-xl border border-neutral-200 px-3 py-2.5">
          <button
            onClick={() => toggleComplete(task)}
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
              task.completed_at ? "border-emerald-500 bg-emerald-500 text-white" : "border-neutral-300",
            )}
          >
            {task.completed_at && <Check size={13} />}
          </button>
          <div className="min-w-0 flex-1">
            <p className={cn("truncate text-sm", task.completed_at ? "text-neutral-400 line-through" : "text-neutral-800")}>
              {task.title}
            </p>
            {task.due_at && (
              <p className="text-xs text-neutral-400">{formatLocal(task.due_at, "MMM d, yyyy")}</p>
            )}
          </div>
        </div>
      ))}

      {open ? (
        <form onSubmit={handleAdd} className="space-y-2 rounded-xl border border-neutral-200 p-3">
          <Input placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="low">Low priority</option>
              <option value="medium">Medium priority</option>
              <option value="high">High priority</option>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving} className="flex-1">
              {saving ? "Saving…" : "Add task"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)} className="w-full">
          <Plus size={16} /> Add task
        </Button>
      )}
    </div>
  );
}
