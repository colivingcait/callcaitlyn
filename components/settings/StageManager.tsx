"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Card, Select } from "@/components/ui";
import { ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";
import type { PipelineStage } from "@/types/database";

function statusOf(stage: PipelineStage) {
  if (stage.is_closed_won) return "won";
  if (stage.is_closed_lost) return "lost";
  return "active";
}

export function StageManager({ stages, ownerId }: { stages: PipelineStage[]; ownerId: string }) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const sorted = [...stages].sort((a, b) => a.sort_order - b.sort_order);

  async function updateStage(id: string, patch: Partial<PipelineStage>) {
    const supabase = createClient();
    await supabase.from("pipeline_stages").update(patch).eq("id", id);
    router.refresh();
  }

  async function deleteStage(id: string) {
    if (!confirm("Delete this stage? Contacts in it will be unassigned.")) return;
    const supabase = createClient();
    await supabase.from("pipeline_stages").delete().eq("id", id);
    router.refresh();
  }

  async function move(index: number, direction: -1 | 1) {
    const target = sorted[index + direction];
    const current = sorted[index];
    if (!target) return;
    const supabase = createClient();
    await Promise.all([
      supabase.from("pipeline_stages").update({ sort_order: target.sort_order }).eq("id", current.id),
      supabase.from("pipeline_stages").update({ sort_order: current.sort_order }).eq("id", target.id),
    ]);
    router.refresh();
  }

  async function addStage(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("pipeline_stages").insert({
      owner_id: ownerId,
      name: newName.trim(),
      sort_order: (sorted.at(-1)?.sort_order ?? 0) + 1,
      color: "#94a3b8",
    });
    setNewName("");
    setSaving(false);
    router.refresh();
  }

  async function updateStatus(stage: PipelineStage, status: string) {
    await updateStage(stage.id, { is_closed_won: status === "won", is_closed_lost: status === "lost" });
  }

  return (
    <Card className="space-y-3">
      <h2 className="text-sm font-semibold text-neutral-700">Pipeline stages</h2>
      <p className="text-xs text-neutral-400">
        &quot;Active&quot; vs &quot;Closed&quot; controls who counts as an active lead on your dashboard and in
        metrics — mark any stage that means the relationship is done (won or lost) as Closed.
      </p>
      <div className="space-y-2">
        {sorted.map((stage, i) => (
          <div key={stage.id} className="flex flex-wrap items-center gap-2">
            <input
              type="color"
              value={stage.color}
              onChange={(e) => updateStage(stage.id, { color: e.target.value })}
              className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-neutral-200"
            />
            <Input
              defaultValue={stage.name}
              onBlur={(e) => e.target.value !== stage.name && updateStage(stage.id, { name: e.target.value })}
              className="min-w-[7rem] flex-1"
            />
            <Select
              value={statusOf(stage)}
              onChange={(e) => updateStatus(stage, e.target.value)}
              className="w-auto shrink-0 text-xs"
            >
              <option value="active">Active</option>
              <option value="won">Closed (Won)</option>
              <option value="lost">Closed (Lost)</option>
            </Select>
            <button
              onClick={() => move(i, -1)}
              disabled={i === 0}
              className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30"
            >
              <ArrowUp size={15} />
            </button>
            <button
              onClick={() => move(i, 1)}
              disabled={i === sorted.length - 1}
              className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30"
            >
              <ArrowDown size={15} />
            </button>
            <button onClick={() => deleteStage(stage.id)} className="rounded-lg p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={addStage} className="flex gap-2 pt-2">
        <Input placeholder="New stage name" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <Button type="submit" size="sm" disabled={saving}>
          <Plus size={15} /> Add
        </Button>
      </form>
    </Card>
  );
}
