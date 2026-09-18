import Link from "next/link";
import { Suspense } from "react";
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
      <Suspense fallback={<div className="px-4 py-8 text-[15px] text-neutral-400 lg:hidden">Loading contacts…</div>}>
        <PeopleMobile
          contacts={contacts}
          stages={stages}
          tags={tags}
          leadSources={leadSources}
          eventNames={eventNames}
          registeredEventNames={registeredEventNames}
          segments={segments}
          sequences={sequences.map((s) => ({ id: s.id, name: s.name, type: s.type }))}
          ownerId={user?.id ?? ""}
          lastActivityLabels={Object.fromEntries(lastActivityLabels)}
        />
      </Suspense>
      {/* Desktop list uses the full main column at lg+, not a phone-width
          max-w-3xl. Mobile PeopleMobile is lg:hidden so the two never stack. */}
      <div className="mx-auto hidden w-full max-w-[1400px] px-8 lg:block">
      <div className="sticky top-0 z-10 bg-[#f7f1ea]">
        <div className="flex items-start justify-between gap-3 pt-8 pb-3">
          <div>
            <h1 className="font-display text-[32px] font-semibold leading-9 tracking-[-0.03em] text-neutral-900">Contacts</h1>
            <p className="mt-1.5 text-[15px] leading-[22px] text-neutral-600">
              {contacts.length} in this list
              {filters.registeredEventName ? " (registered for an event" : " (current filters"}
              , not archived, not spam). Pipeline counts active stages only; Reports counts all non-archived.{" "}
              {withPhoneCount} have a phone number you can text. Deal board:{" "}
              <Link href="/pipeline" className="font-medium text-brand-700 hover:underline">
                Pipeline
              </Link>
              .
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={`/api/contacts/export?${usp.toString()}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
            >
              <Download size={14} /> Export
            </a>
            {user && <BulkImportContactsButton tags={tags} ownerId={user.id} />}
            <Link
              href="/contacts/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              <Plus size={15} /> New contact
            </Link>
          </div>
        </div>
        {filters.leadDateWithinDays && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
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
      </div>
      <div className="bg-transparent pb-8">
        <ContactsList
          contacts={contacts}
          tags={tags}
          stages={stages}
          ownerId={user?.id ?? ""}
          sequences={sequences.map((s) => ({ id: s.id, name: s.name, type: s.type }))}
          groupBy={groupBy}
          lastActivityLabels={Object.fromEntries(lastActivityLabels)}
        />
      </div>
      </div>
    </>
  );
}
