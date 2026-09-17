import Link from "next/link";
import { cn } from "@/lib/utils";
import type { PipelineStage } from "@/types/database";

const RING = ["#c45c4a", "#d4a08c", "#8a4a3c", "#e8cfc4", "#ac3826"];

export function TodayPipelineOverview({
  stages,
  counts,
  size = "phone",
}: {
  stages: PipelineStage[];
  counts: Map<string, number>;
  size?: "phone" | "desktop";
}) {
  const slices = stages
    .filter((s) => !s.is_closed_lost && !s.is_trash)
    .map((stage, i) => ({
      id: stage.id,
      name: stage.name,
      count: counts.get(stage.id) ?? 0,
      color: RING[i % RING.length],
    }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  const total = slices.reduce((sum, s) => sum + s.count, 0);
  const gradient =
    total === 0
      ? "conic-gradient(#eadfd6 0deg 360deg)"
      : `conic-gradient(${slices
          .reduce<{ acc: number; parts: string[] }>(
            (state, slice) => {
              const start = (state.acc / total) * 360;
              const next = state.acc + slice.count;
              const end = (next / total) * 360;
              state.parts.push(`${slice.color} ${start}deg ${end}deg`);
              state.acc = next;
              return state;
            },
            { acc: 0, parts: [] },
          )
          .parts.join(", ")})`;

  const donut = size === "desktop" ? "h-[168px] w-[168px]" : "h-[118px] w-[118px]";
  const hole = size === "desktop" ? "h-[108px] w-[108px]" : "h-[76px] w-[76px]";

  return (
    <section
      data-today-home="pipeline"
      className="h-full min-w-0 overflow-hidden rounded-[20px] border border-[#eadfd6]/90 bg-[#fffbf8] p-4 shadow-card sm:p-5"
    >
      <p className="text-[13px] font-semibold text-neutral-800">Pipeline Overview</p>
      <div className={cn("mt-3 flex min-w-0 items-center gap-5", size === "desktop" && "gap-8")}>
        <Link href="/pipeline" aria-label={`${total} in pipeline`} className="relative shrink-0">
          <div className={cn("rounded-full", donut)} style={{ background: gradient }} />
          <div className={cn("absolute inset-0 m-auto flex flex-col items-center justify-center rounded-full bg-[#fffbf8]", hole)}>
            <p className={cn("font-serif font-semibold leading-none text-neutral-900", size === "desktop" ? "text-[32px]" : "text-[22px]")}>
              {total}
            </p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-neutral-400">Total</p>
          </div>
        </Link>
        <ul className="min-w-0 flex-1 space-y-2">
          {slices.length === 0 ? (
            <li className="text-[14px] text-neutral-400">No one in pipeline yet.</li>
          ) : (
            slices.map((slice) => (
              <li key={slice.id}>
                <Link href={`/pipeline?stage=${slice.id}`} className="flex items-center gap-2.5 text-[14px]">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
                  <span className="w-6 shrink-0 font-semibold text-neutral-800">{slice.count}</span>
                  <span className="min-w-0 truncate text-neutral-500">{slice.name}</span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}
