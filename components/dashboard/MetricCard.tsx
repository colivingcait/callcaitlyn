import { ArrowUp, ArrowDown, Minus, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GoalEditor } from "@/components/dashboard/GoalEditor";
import type { MetricResult } from "@/lib/data/metrics";
import type { MetricKey } from "@/types/database";

function formatValue(value: number | null, kind: "hours" | "percent"): string {
  if (value == null) return "—";
  if (kind === "percent") return `${Math.round(value)}%`;
  if (value < 1) return `${Math.round(value * 60)}m`;
  return `${value.toFixed(1)}h`;
}

export function MetricCard({
  label,
  result,
  kind,
  ownerId,
  metricKey,
}: {
  label: string;
  result: MetricResult;
  kind: "hours" | "percent";
  ownerId: string;
  metricKey: MetricKey;
}) {
  const { current, improved, goal, meetsGoal } = result;

  return (
    <div className="rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-card">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{label}</p>
        {meetsGoal && <CheckCircle2 size={15} className="text-emerald-500" />}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="font-serif text-2xl font-semibold text-neutral-900">{formatValue(current, kind)}</p>
        {improved != null && (
          <span
            className={cn(
              "flex items-center text-xs font-medium",
              improved ? "text-emerald-600" : "text-red-500",
            )}
          >
            {improved ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
          </span>
        )}
        {improved == null && current != null && <Minus size={13} className="text-neutral-300" />}
      </div>
      <GoalEditor ownerId={ownerId} metricKey={metricKey} currentGoal={goal} unit={kind === "percent" ? "%" : "h"} />
    </div>
  );
}
