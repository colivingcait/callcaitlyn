import { listContacts, listStages, listTags, listSegments, type ContactSort } from "@/lib/data/contacts";
import { listSequencesWithSummary } from "@/lib/data/sequences";
import { ContactsList } from "@/components/contacts/ContactsList";
import { ContactFilters } from "@/components/contacts/ContactFilters";
import { SegmentBar } from "@/components/contacts/SegmentBar";
import { BulkImportContactsButton } from "@/components/contacts/BulkImportContactsButton";
import { createClient } from "@/lib/supabase/server";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    stage?: string;
    tag?: string;
    type?: string;
    timeline?: string;
    representing?: string;
    phone?: string;
    sort?: string;
  }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [contacts, stages, tags, sequences, segments] = await Promise.all([
    listContacts({
      q: params.q,
      stageId: params.stage,
      tagId: params.tag,
      type: params.type,
      timeline: params.timeline,
      representing: params.representing,
      hasPhone: params.phone === "1",
      sort: params.sort as ContactSort | undefined,
    }),
    listStages(),
    listTags(),
    listSequencesWithSummary(),
    listSegments(),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-start justify-between gap-3 px-4 pt-6 pb-2">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-neutral-900">Contacts</h1>
          <p className="mt-0.5 text-sm text-neutral-500">{contacts.length} people</p>
        </div>
        {user && <BulkImportContactsButton tags={tags} ownerId={user.id} />}
      </div>
      <ContactFilters stages={stages} tags={tags} />
      {user && <SegmentBar segments={segments} ownerId={user.id} />}
      <div className="bg-white">
        <ContactsList
          contacts={contacts}
          tags={tags}
          sequences={sequences.map((s) => ({ id: s.id, name: s.name, type: s.type }))}
        />
      </div>
    </div>
  );
}
