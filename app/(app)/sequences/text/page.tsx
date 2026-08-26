import { listRegisteredEventNames, listTags } from "@/lib/data/contacts";
import { getAllTextBlasts } from "@/app/(app)/contacts/text-blast-actions";
import { CampaignsTabNav } from "@/components/sequences/CampaignsTabNav";
import { TextTabClient } from "@/components/sequences/TextTabClient";

export default async function TextBlastsPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event } = await searchParams;
  const [eventNames, tags, blasts] = await Promise.all([listRegisteredEventNames(), listTags(), getAllTextBlasts()]);

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-neutral-900">Bulk Communication</h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          Scheduled sequences, drip campaigns, one-off batch emails, and text reminders to your meetup community.
        </p>
      </div>

      <CampaignsTabNav />

      <TextTabClient eventNames={eventNames} tags={tags} blasts={blasts} initialComposeEvent={event ?? null} />
    </div>
  );
}
