import { listSequencesWithSummary, getAllSequencesSummary } from "@/lib/data/sequences";
import { listTags, listStages, listRegisteredEventNames } from "@/lib/data/contacts";
import { getAllTextBlasts } from "@/app/(app)/contacts/text-blast-actions";
import { CreateSequenceForm } from "@/components/sequences/CreateSequenceForm";
import { NewTextButton } from "@/components/sequences/NewTextButton";
import { SequencesDashboard } from "@/components/sequences/SequencesDashboard";
import { CampaignsList } from "@/components/sequences/CampaignsList";
import { createClient } from "@/lib/supabase/server";

export default async function CampaignsPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [sequences, tags, stages, summary, blasts, eventNames] = await Promise.all([
    listSequencesWithSummary(),
    listTags(),
    listStages(),
    getAllSequencesSummary(),
    getAllTextBlasts(),
    listRegisteredEventNames(),
  ]);

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1400px] space-y-5 px-5 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[32px] font-semibold tracking-[-0.03em] text-neutral-900">Campaigns</h1>
          <p className="mt-0.5 text-sm text-neutral-500">Scheduled sequences, drips, one-off emails and texts to your meetup community.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <NewTextButton eventNames={eventNames} tags={tags} autoOpenEvent={event} />
        </div>
      </div>

      {summary.totalCount > 0 && <SequencesDashboard summary={summary} />}

      {user && <CreateSequenceForm tags={tags} stages={stages} ownerId={user.id} />}

      <CampaignsList sequences={sequences} blasts={blasts} tags={tags} />
    </div>
  );
}
