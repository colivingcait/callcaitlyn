import Link from "next/link";
import type { PipelineStage } from "@/types/database";

export function StageBreakdown({
  stages,
  counts,
}: {
  stages: PipelineStage[];
  counts: Map<string, number>;
}) {
  const max = Math.max(1, ...stages.map((s) => counts.get(s.id) ?? 0));

  return (
    <div className="space-y-3">
      {stages.map((stage) => {
        const count = counts.get(stage.id) ?? 0;
        const pct = Math.round((count / max) * 100);
        return (
          <Link
            key={stage.id}
            href={`/pipeline?stage=${stage.id}`}
            className="block rounded-xl p-2 -mx-2 hover:bg-neutral-50"
          >
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-neutral-700">{stage.name}</span>
              <span className="text-neutral-400">{count}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%`, backgroundColor: stage.color }}
              />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
