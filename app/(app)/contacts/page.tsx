import Link from "next/link";
import { X } from "lucide-react";
import { listContacts, listStages, listTags, listLeadSources, listSegments, type ContactSort } from "@/lib/data/contacts";
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
    source?: string;
    phone?: string;
    sort?: string;
    newSince?: string;
  }>;
}) {
  const params = await searchParams;
  const newSinceDays = params.newSince ? Number(params.newSince) : undefined;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [contacts, stages, tags, leadSources, sequences, segments] = await Promise.all([
    listContacts({
      q: params.q,
      stageId: params.stage,
      tagId: params.tag,
      type: params.type,
      timeline: params.timeline,
      representing: params.representing,
      leadSource: params.source,
      hasPhone: params.phone === "1",
      missingPhone: params.phone === "0",
      leadDateWithinDays: newSinceDays,
      sort: params.sort as ContactSort | undefined,
    }),
    listStages(),
    listTags(),
    listLeadSources(),
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
      {newSinceDays && (
        <div className="mx-4 mb-2 flex items-center justify-between gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
          <span>
            Showing new leads from the last {newSinceDays} day{newSinceDays === 1 ? "" : "s"}
          </span>
          <Link href="/contacts" className="flex shrink-0 items-center gap-1 font-medium hover:underline">
            <X size={13} /> Clear
          </Link>
        </div>
      )}
      <ContactFilters stages={stages} tags={tags} leadSources={leadSources} />
      {user && <SegmentBar segments={segments} ownerId={user.id} />}
      <div className="bg-white">
        <ContactsList
          contacts={contacts}
          tags={tags}
          stages={stages}
          ownerId={user?.id ?? ""}
          sequences={sequences.map((s) => ({ id: s.id, name: s.name, type: s.type }))}
        />
      </div>
    </div>
  );
}
