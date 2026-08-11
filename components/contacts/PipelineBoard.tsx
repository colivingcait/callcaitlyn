import { PipelineCard } from "@/components/contacts/PipelineCard";
import type { ContactWithRelations, PipelineStage } from "@/types/database";

export function PipelineBoard({
  stages,
  contacts,
  openStageId,
}: {
  stages: PipelineStage[];
  contacts: ContactWithRelations[];
  openStageId?: string;
}) {
  const byStage = new Map<string, ContactWithRelations[]>();
  for (const c of contacts) {
    if (!c.stage_id) continue;
    byStage.set(c.stage_id, [...(byStage.get(c.stage_id) ?? []), c]);
  }

  return (
    <>
      {/* Mobile: accordion sections */}
      <div className="space-y-2 px-4 md:hidden">
        {stages.map((stage) => {
          const items = byStage.get(stage.id) ?? [];
          return (
            <details
              key={stage.id}
              open={openStageId ? stage.id === openStageId : items.length > 0}
              className="rounded-2xl border border-neutral-200 bg-white"
            >
              <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-neutral-800">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />
                  {stage.name}
                </span>
                <span className="text-neutral-400">{items.length}</span>
              </summary>
              <div className="max-h-[24rem] space-y-2 overflow-y-auto border-t border-neutral-100 p-3">
                {items.length === 0 ? (
                  <p className="py-2 text-center text-xs text-neutral-400">No contacts in this stage.</p>
                ) : (
                  items.map((c) => <PipelineCard key={c.id} contact={c} stages={stages} />)
                )}
              </div>
            </details>
          );
        })}
      </div>

      {/* Desktop: kanban columns, wrapping into new rows instead of an
          ever-widening single row - visible stage count shouldn't force
          horizontal scrolling to see the rest of the board. */}
      <div className="hidden gap-4 px-6 pb-6 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stages.map((stage) => {
          const items = byStage.get(stage.id) ?? [];
          return (
            <div key={stage.id} className="flex flex-col">
              <div className="mb-3 flex items-center gap-2 px-1">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />
                <h3 className="text-sm font-semibold text-neutral-800">{stage.name}</h3>
                <span className="text-xs text-neutral-400">{items.length}</span>
              </div>
              <div className="max-h-[32rem] space-y-2 overflow-y-auto rounded-2xl bg-neutral-100/60 p-2">
                {items.length === 0 ? (
                  <p className="py-6 text-center text-xs text-neutral-400">Empty</p>
                ) : (
                  items.map((c) => <PipelineCard key={c.id} contact={c} stages={stages} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
