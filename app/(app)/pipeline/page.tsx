import Link from "next/link";
import { listContacts, listStages } from "@/lib/data/contacts";
import { PipelineBoard } from "@/components/contacts/PipelineBoard";
import { TodayPipelineOverview } from "@/components/dashboard/TodayPipelineOverview";

export default async function PipelinePage({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  const params = await searchParams;
  const [contacts, stages] = await Promise.all([listContacts({}), listStages()]);
  const activeStageIds = new Set(stages.filter((s) => !s.is_closed_won && !s.is_closed_lost && !s.is_trash).map((s) => s.id));
  const activeCount = contacts.filter((c) => c.stage_id && activeStageIds.has(c.stage_id)).length;
  const stageCounts = new Map<string, number>();
  for (const c of contacts) {
    if (!c.stage_id) continue;
    stageCounts.set(c.stage_id, (stageCounts.get(c.stage_id) ?? 0) + 1);
  }

  return (
    <div className="min-w-0 overflow-x-hidden">
      <div className="px-4 pt-6 pb-4 lg:px-8 lg:pt-8">
        <h1 className="font-display text-[32px] font-semibold tracking-[-0.03em] text-neutral-900">Pipeline</h1>
        <p className="mt-1 text-[15px] leading-[22px] text-neutral-500">
          {activeCount} active people across {stages.length} stages. Search everyone and lists live in{" "}
          <Link href="/contacts" className="font-medium text-brand-700 hover:underline">
            Contacts
          </Link>
          .
        </p>
      </div>
      <div className="hidden min-w-0 px-8 pb-5 lg:block">
        <TodayPipelineOverview stages={stages} counts={stageCounts} size="desktop" />
      </div>
      <PipelineBoard stages={stages} contacts={contacts} openStageId={params.stage} />
    </div>
  );
}
