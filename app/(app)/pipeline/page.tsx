import { listContacts, listStages } from "@/lib/data/contacts";
import { PipelineBoard } from "@/components/contacts/PipelineBoard";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string }>;
}) {
  const params = await searchParams;
  const [contacts, stages] = await Promise.all([listContacts({}), listStages()]);

  return (
    <div>
      <div className="px-4 pt-6 pb-4 md:px-6">
        <h1 className="text-xl font-semibold text-neutral-900">Pipeline</h1>
        <p className="mt-0.5 text-sm text-neutral-500">Tap a stage to see who&apos;s in it. Move contacts with the stage dropdown.</p>
      </div>
      <PipelineBoard stages={stages} contacts={contacts} openStageId={params.stage} />
    </div>
  );
}
