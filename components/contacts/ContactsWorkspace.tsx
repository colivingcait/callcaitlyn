"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ContactFilters } from "@/components/contacts/ContactFilters";
import { ContactFiltersSheet } from "@/components/contacts/ContactFiltersSheet";
import { ContactsList } from "@/components/contacts/ContactsList";
import { ContactsListTabs } from "@/components/contacts/ContactsListTabs";
import type { ContactGroupBy } from "@/lib/crm/contact-filter-params";
import type { ContactSegment, ContactWithRelations, PipelineStage, Tag } from "@/types/database";

type SequenceOption = { id: string; name: string; type: "broadcast" | "drip" | "batch" };

export function ContactsWorkspace({
  contacts,
  stages,
  tags,
  leadSources,
  eventNames,
  registeredEventNames,
  segments,
  sequences,
  ownerId,
  groupBy,
  lastActivityLabels,
}: {
  contacts: ContactWithRelations[];
  stages: PipelineStage[];
  tags: Tag[];
  leadSources: string[];
  eventNames: string[];
  registeredEventNames: string[];
  segments: ContactSegment[];
  sequences: SequenceOption[];
  ownerId: string;
  groupBy: ContactGroupBy;
  lastActivityLabels: Record<string, string>;
}) {
  const [selecting, setSelecting] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="flex min-w-0 items-start gap-0">
      <div className="min-w-0 flex-1 space-y-4 pb-8">
        <ContactsListTabs segments={segments} ownerId={ownerId} />
        <ContactFilters
          stages={stages}
          tags={tags}
          leadSources={leadSources}
          eventNames={eventNames}
          registeredEventNames={registeredEventNames}
          panel
          filtersOpen={filtersOpen}
          onFiltersOpenChange={setFiltersOpen}
          selectSlot={
            <div className="relative">
              <button
                type="button"
                onClick={() => setSelectOpen((v) => !v)}
                className="flex items-center gap-2 rounded-[11px] border border-neutral-200 bg-white px-3.5 py-3 text-[15px] font-medium text-neutral-800"
              >
                Select <ChevronDown size={15} className="text-neutral-400" />
              </button>
              {selectOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-xl border border-neutral-200 bg-white p-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setSelecting(true);
                      setSelectOpen(false);
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                  >
                    Select rows
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelecting(false);
                      setSelectOpen(false);
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          }
        />
        <ContactsList
          contacts={contacts}
          tags={tags}
          stages={stages}
          ownerId={ownerId}
          sequences={sequences}
          segments={segments}
          groupBy={groupBy}
          lastActivityLabels={lastActivityLabels}
          selecting={selecting}
          onSelectingChange={setSelecting}
        />
      </div>
      {filtersOpen && (
        <aside className="sticky top-[88px] hidden w-[280px] shrink-0 self-start lg:block">
          <ContactFiltersSheet
            stages={stages}
            tags={tags}
            leadSources={leadSources}
            eventNames={eventNames}
            registeredEventNames={registeredEventNames}
            variant="panel"
            onClose={() => setFiltersOpen(false)}
          />
        </aside>
      )}
    </div>
  );
}
