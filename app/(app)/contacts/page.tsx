import Link from "next/link";
import { X, Download } from "lucide-react";
import { listContacts, listStages, listTags, listLeadSources, listLastEventNames, listSegments } from "@/lib/data/contacts";
import { listSequencesWithSummary } from "@/lib/data/sequences";
import { parseContactFilterParams } from "@/lib/crm/contact-filter-params";
import { ContactsList } from "@/components/contacts/ContactsList";
import { ContactFilters } from "@/components/contacts/ContactFilters";
import { SegmentBar } from "@/components/contacts/SegmentBar";
import { BulkImportContactsButton } from "@/components/contacts/BulkImportContactsButton";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export default async function ContactsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const rawParams = await searchParams;
  // One URLSearchParams built up front, then handed to the same parser the
  // export route uses - the page and the export can never drift apart on
  // what a given filter param means, and it doubles as the export link's
  // query string (export always matches exactly what's on screen).
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(rawParams)) {
    if (value) usp.set(key, value);
  }
  const filters = parseContactFilterParams(usp);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [contacts, stages, tags, leadSources, eventNames, sequences, segments] = await Promise.all([
    listContacts(filters),
    listStages(),
    listTags(),
    listLeadSources(),
    listLastEventNames(),
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
        <div className="flex shrink-0 items-center gap-2">
          <a href={`/api/contacts/export?${usp.toString()}`}>
            <Button variant="secondary" size="sm">
              <Download size={14} /> Export
            </Button>
          </a>
          {user && <BulkImportContactsButton tags={tags} ownerId={user.id} />}
        </div>
      </div>
      {filters.leadDateWithinDays && (
        <div className="mx-4 mb-2 flex items-center justify-between gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
          <span>
            Showing new leads from the last {filters.leadDateWithinDays} day{filters.leadDateWithinDays === 1 ? "" : "s"}
          </span>
          <Link href="/contacts" className="flex shrink-0 items-center gap-1 font-medium hover:underline">
            <X size={13} /> Clear
          </Link>
        </div>
      )}
      <ContactFilters stages={stages} tags={tags} leadSources={leadSources} eventNames={eventNames} />
      {user && <SegmentBar segments={segments} ownerId={user.id} />}
      <div className="bg-white">
        <ContactsList
          contacts={contacts}
          tags={tags}
          stages={stages}
          ownerId={user?.id ?? ""}
          sequences={sequences.map((s) => ({ id: s.id, name: s.name, type: s.type }))}
          groupBy={filters.groupBy}
        />
      </div>
    </div>
  );
}
