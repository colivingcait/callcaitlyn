import { PipelineCard } from "@/components/contacts/PipelineCard";
import { Section } from "@/components/ui/Section";
import { getPipelineExtras } from "@/lib/data/pipeline";
import { formatCurrency } from "@/lib/utils";
import type { ContactWithRelations, PipelineStage } from "@/types/database";

// Stages ordered by closeness to money rather than pipeline sequence -
// Under Contract and Hot/Ready are the two she actually acts on day to
// day, so they open by default; everything else (including New Lead,
// which is high-volume but low-per-contact-urgency) stays collapsed
// until she wants it. One collapse mechanism (Section/useSectionOpen)
// for all 9 stages rather than two different ones for a "top 3" vs. "the
// rest" grouping - simpler, and every stage gets the same persisted
// open/closed state across visits.
export async function PipelineBoard({
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

  const extras = await getPipelineExtras(contacts, stages);

  const underContractStage = stages.find((s) => s.is_under_contract);
  const hotStage = stages.find((s) => s.name.toLowerCase().includes("hot"));
  const newLeadStage = stages.find((s) => s.name.toLowerCase().includes("new lead"));

  const featured = [underContractStage, hotStage, newLeadStage].filter((s): s is PipelineStage => !!s);
  const featuredIds = new Set(featured.map((s) => s.id));
  const rest = stages.filter((s) => !featuredIds.has(s.id));
  const ordered = [...featured, ...rest];

  function summaryFor(stage: PipelineStage, items: ContactWithRelations[]): { text: string; quiet: boolean } | null {
    if (stage.is_under_contract) {
      const total = items.reduce((sum, c) => sum + (extras.pendingDealByContact.get(c.id)?.netCommission ?? 0), 0);
      return total > 0 ? { text: `${formatCurrency(total)} projected`, quiet: false } : null;
    }
    if (stage.id === hotStage?.id) {
      const goneQuiet = items.filter((c) => extras.coldFromHotIds.has(c.id)).length;
      return goneQuiet > 0 ? { text: `${goneQuiet} gone quiet 30+ days`, quiet: true } : null;
    }
    if (stage.id === newLeadStage?.id) {
      const neverCalled = items.filter((c) => extras.neverCalledIds.has(c.id)).length;
      return neverCalled > 0 ? { text: `${neverCalled} never called`, quiet: false } : null;
    }
    return null;
  }

  return (
    <div className="space-y-2.5 px-4 pb-8 md:px-6">
      {ordered.map((stage) => {
        const items = byStage.get(stage.id) ?? [];
        const summary = summaryFor(stage, items);
        const defaultOpen = stage.id === underContractStage?.id || stage.id === hotStage?.id;
        return (
          <Section
            key={stage.id}
            sectionKey={`pipeline:stage:${stage.id}`}
            title={stage.name}
            meta={`${items.length}`}
            defaultOpen={defaultOpen}
            forceOpen={openStageId ? stage.id === openStageId : undefined}
            action={
              summary ? <span className={`shrink-0 text-[15px] font-semibold ${summary.quiet ? "text-red-700" : "text-neutral-600"}`}>{summary.text}</span> : undefined
            }
          >
            <div className="space-y-2 bg-[#fcfbfa] p-3.5">
              {items.length === 0 ? (
                <p className="py-4 text-center text-sm text-neutral-400">Nobody in this stage.</p>
              ) : (
                items.map((c) => <PipelineCard key={c.id} contact={c} stage={stage} stages={stages} extras={extras} />)
              )}
            </div>
          </Section>
        );
      })}
      <p className="px-0.5 pt-2 text-[15px] leading-[22px] text-neutral-500">
        Stages are ordered by how close they are to money, not by pipeline order — the two you act on sit at the top, the rest stay shut until you want
        them.
      </p>
    </div>
  );
}
