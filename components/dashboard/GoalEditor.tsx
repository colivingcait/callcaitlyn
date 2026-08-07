"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Target } from "lucide-react";
import type { MetricKey } from "@/types/database";

export function GoalEditor({
  ownerId,
  metricKey,
  currentGoal,
  unit,
}: {
  ownerId: string;
  metricKey: MetricKey;
  currentGoal: number | null;
  unit: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentGoal?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(value);
    if (Number.isNaN(num)) return;
    setSaving(true);

    const supabase = createClient();
    await supabase
      .from("metric_goals")
      .upsert({ owner_id: ownerId, metric_key: metricKey, target_value: num }, { onConflict: "owner_id,metric_key" });

    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="mt-2 flex items-center gap-1.5">
        <input
          type="number"
          step="any"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-16 rounded-lg border border-neutral-200 px-1.5 py-0.5 text-xs"
        />
        <span className="text-[11px] text-neutral-400">{unit}</span>
        <button type="submit" disabled={saving} className="text-[11px] font-medium text-brand-600">
          Save
        </button>
        <button type="button" onClick={() => setEditing(false)} className="text-[11px] text-neutral-400">
          Cancel
        </button>
      </form>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="mt-2 flex items-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-600"
    >
      <Target size={11} />
      {currentGoal != null ? `Goal: ${currentGoal}${unit}` : "Set a goal"}
    </button>
  );
}
