"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { SegmentedControl } from "@/components/mobile/SegmentedControl";
import { PeopleList } from "@/components/contacts/mobile/PeopleList";
import { MyLists } from "@/components/contacts/mobile/MyLists";
import { InsideList } from "@/components/contacts/mobile/InsideList";
import { ContactFiltersSheet } from "@/components/contacts/ContactFiltersSheet";
import type { ContactWithRelations, PipelineStage, Tag, ContactSegment } from "@/types/database";

type SequenceOption = { id: string; name: string; type: string };
type PeopleView = "everyone" | "by-stage" | "my-lists";

export function PeopleMobile({
  contacts,
  stages,
  tags,
  leadSources,
  eventNames,
  segments,
  sequences,
  ownerId,
}: {
  contacts: ContactWithRelations[];
  stages: PipelineStage[];
  tags: Tag[];
  leadSources: string[];
  eventNames: string[];
  segments: ContactSegment[];
  sequences: SequenceOption[];
  ownerId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");

  const view = (searchParams.get("view") as PeopleView | null) ?? "by-stage";
  const listLabel = searchParams.get("list");
  const insideList = view === "my-lists" && !!listLabel;

  const activeFilterCount = Array.from(searchParams.keys()).filter((k) => !["view", "list"].includes(k)).length;

  function setView(next: PeopleView) {
    const params = new URLSearchParams();
    params.set("view", next);
    router.push(`/contacts?${params.toString()}`);
  }

  const searched = search.trim()
    ? contacts.filter((c) => `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.trim().toLowerCase()))
    : contacts;

  const textableCount = contacts.filter((c) => c.phone).length;

  return (
    <div className="px-4 py-5 md:hidden">
      {insideList ? (
        <InsideList
          listName={listLabel!}
          contacts={contacts}
          stages={stages}
          tags={tags}
          sequences={sequences}
          ownerId={ownerId}
          backHref="/contacts?view=my-lists"
        />
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="font-serif text-2xl font-semibold text-neutral-900">People</p>
            <div className="flex items-center gap-2">
              <Link href="/contacts/new" aria-label="New contact" className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white">
                <Plus size={20} />
              </Link>
            </div>
          </div>

          <div className="relative mb-3">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people"
              className="h-[50px] w-full rounded-[14px] border border-neutral-200 pl-10 pr-3.5 text-[16px] text-neutral-900"
            />
          </div>

          <SegmentedControl
            value={view}
            onChange={setView}
            options={[
              { value: "everyone", label: "Everyone" },
              { value: "by-stage", label: "By stage" },
              { value: "my-lists", label: "My lists" },
            ]}
          />

          {view !== "my-lists" && (
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-[14px] text-neutral-500">
                {view === "by-stage" ? "Grouped by stage" : "Everyone"} · {textableCount} textable
              </p>
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="flex h-10 items-center gap-1.5 rounded-full border border-brand-300 bg-brand-50 px-3 text-[13px] font-semibold text-brand-700"
              >
                <SlidersHorizontal size={14} /> Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
              </button>
            </div>
          )}

          <div className="mt-3">
            {view === "my-lists" ? (
              <MyLists contacts={contacts} eventNames={eventNames} leadSources={leadSources} segments={segments} />
            ) : (
              <PeopleList contacts={searched} stages={stages} ownerId={ownerId} grouped={view === "by-stage"} />
            )}
          </div>
        </>
      )}

      {filtersOpen && <ContactFiltersSheet stages={stages} tags={tags} leadSources={leadSources} eventNames={eventNames} onClose={() => setFiltersOpen(false)} />}
    </div>
  );
}
