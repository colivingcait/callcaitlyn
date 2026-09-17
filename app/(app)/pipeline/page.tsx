import Link from "next/link";
import { listContacts, listStages } from "@/lib/data/contacts";
import { PipelineBoard } from "@/components/contacts/PipelineBoard";

export default async function PipelinePage({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  const params = await searchParams;
  const [contacts, stages] = await Promise.all([listContacts({}), listStages()]);
  const activeStageIds = new Set(stages.filter((s) => !s.is_closed_won && !s.is_closed_lost && !s.is_trash).map((s) => s.id));
  const activeCount = contacts.filter((c) => c.stage_id && activeStageIds.has(c.stage_id)).length;

  return (
    <div>
      <div className="px-4 pt-6 pb-4 md:px-6">
        <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-[28px]">Pipeline</h1>
        <p className="mt-1 text-[15px] leading-[22px] text-neutral-500">
          {activeCount} active people across {stages.length} stages. This board is under More. Search everyone and lists live in{" "}
          <Link href="/contacts" className="font-medium text-brand-700 hover:underline">
            Contacts
          </Link>
          .
        </p>
      </div>
      <PipelineBoard stages={stages} contacts={contacts} openStageId={params.stage} />
    </div>
  );
}
