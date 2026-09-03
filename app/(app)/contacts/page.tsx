import Link from "next/link";
import { X, Download, Plus } from "lucide-react";
import {
  listContacts,
  listStages,
  listTags,
  listLeadSources,
  listLastEventNames,
  listRegisteredEventNames,
  listSegments,
  getLastActivityLabels,
} from "@/lib/data/contacts";
import { listSequencesWithSummary } from "@/lib/data/sequences";
import { parseContactFilterParams } from "@/lib/crm/contact-filter-params";
import { ContactsList } from "@/components/contacts/ContactsList";
import { ContactFilters } from "@/components/contacts/ContactFilters";
import { SegmentBar } from "@/components/contacts/SegmentBar";
import { BulkImportContactsButton } from "@/components/contacts/BulkImportContactsButton";
import { PeopleMobile } from "@/components/contacts/mobile/PeopleMobile";
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
  // Grouped by stage by default - the header for each group is the stage,
  // so this is the view the redesign is built around, not an opt-in.
  const groupBy = filters.groupBy ?? "stage";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [contacts, stages, tags, leadSources, eventNames, registeredEventNames, sequences, segments] = await Promise.all([
    listContacts(filters),
    listStages(),
    listTags(),
    listLeadSources(),
    listLastEventNames(),
    listRegisteredEventNames(),
    listSequencesWithSummary(),
    listSegments(),
  ]);
  const lastActivityLabels = await getLastActivityLabels(contacts.map((c) => c.id));
  const withPhoneCount = contacts.filter((c) => c.phone).length;

  return (
    <>
      <PeopleMobile
        contacts={contacts}
        stages={stages}
        tags={tags}
        leadSources={leadSources}
        eventNames={registeredEventNames}
        segments={segments}
        sequences={sequences.map((s) => ({ id: s.id, name: s.name, type: s.type }))}
        ownerId={user?.id ?? ""}
      />
      <div className="mx-auto hidden max-w-3xl md:block">
      <div className="flex items-start justify-between gap-3 px-4 pt-6 pb-2 sm:px-0">
        <div>
          <h1 className="font-serif text-2xl font-semibold leading-9 text-neutral-900 sm:text-[28px]">Contacts</h1>
          <p className="mt-1.5 text-[15px] leading-[22px] text-neutral-600">
            {contacts.length} people · {withPhoneCount} have a phone number you can text
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a href={`/api/contacts/export?${usp.toString()}`}>
            <Button variant="secondary" size="sm">
              <Download size={14} /> Export
            </Button>
          </a>
          {user && <BulkImportContactsButton tags={tags} ownerId={user.id} />}
          <Link href="/contacts/new">
            <Button size="sm">
              <Plus size={15} /> New contact
            </Button>
          </Link>
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
      <ContactFilters
        stages={stages}
        tags={tags}
        leadSources={leadSources}
        eventNames={eventNames}
        registeredEventNames={registeredEventNames}
      />
      {user && <SegmentBar segments={segments} ownerId={user.id} />}
      <div className="bg-white sm:bg-transparent">
        <ContactsList
          contacts={contacts}
          tags={tags}
          stages={stages}
          ownerId={user?.id ?? ""}
          sequences={sequences.map((s) => ({ id: s.id, name: s.name, type: s.type }))}
          groupBy={groupBy}
          lastActivityLabels={lastActivityLabels}
        />
      </div>
      </div>
    </>
  );
}
