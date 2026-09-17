"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { SegmentedControl } from "@/components/mobile/SegmentedControl";
import { PeopleList } from "@/components/contacts/mobile/PeopleList";
import { MyLists } from "@/components/contacts/mobile/MyLists";
import { InsideList } from "@/components/contacts/mobile/InsideList";
import { ContactFiltersSheet } from "@/components/contacts/ContactFiltersSheet";
import { SORT_OPTIONS } from "@/components/contacts/ContactFilters";
import { QUEUES } from "@/lib/crm/contact-queues";
import { cn } from "@/lib/utils";
import type { ContactGroupBy } from "@/lib/crm/contact-filter-params";
import type { ContactWithRelations, PipelineStage, Tag, ContactSegment } from "@/types/database";

type SequenceOption = { id: string; name: string; type: string };
type PeopleView = "everyone" | "by-stage" | "my-lists";

const GROUP_VALUES: ContactGroupBy[] = ["none", "stage", "tag", "source", "month"];

function matchesQuery(contact: ContactWithRelations, q: string) {
  const hay = `${contact.first_name} ${contact.last_name} ${contact.email ?? ""} ${contact.phone ?? ""}`.toLowerCase();
  return hay.includes(q.trim().toLowerCase());
}

export function PeopleMobile({
  contacts,
  stages,
  tags,
  leadSources,
  eventNames,
  registeredEventNames,
  segments,
  sequences,
  ownerId,
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
  lastActivityLabels: Record<string, string>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const view = (searchParams.get("view") as PeopleView | null) ?? "by-stage";
  const listLabel = searchParams.get("list");
  const insideList = view === "my-lists" && !!listLabel;
  const urlGroup = searchParams.get("group");
  const groupBy: ContactGroupBy =
    view === "everyone" ? "none" : GROUP_VALUES.includes(urlGroup as ContactGroupBy) ? (urlGroup as ContactGroupBy) : "stage";
  const activeQueue = searchParams.get("queue");

  const activeFilterCount = Array.from(searchParams.keys()).filter((k) => {
    if (["view", "list", "sort", "q", "queue"].includes(k)) return false;
    if (view === "everyone" && k === "group") return false;
    return true;
  }).length;
  const currentSort = searchParams.get("sort") ?? "updated_desc";

  function pushParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const qs = params.toString();
    router.push(qs ? `/contacts?${qs}` : "/contacts");
  }

  function setView(next: PeopleView) {
    pushParams((params) => {
      params.set("view", next);
      if (next !== "my-lists") params.delete("list");
      if (next === "everyone") params.delete("group");
    });
  }

  function setSort(value: string) {
    pushParams((params) => {
      if (value === "updated_desc") params.delete("sort");
      else params.set("sort", value);
    });
  }

  function toggleQueue(value: string) {
    pushParams((params) => {
      if (params.get("queue") === value) params.delete("queue");
      else params.set("queue", value);
    });
  }

  useEffect(() => {
    setSearch(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function onSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushParams((params) => {
        if (value.trim()) params.set("q", value.trim());
        else params.delete("q");
      });
    }, 300);
  }

  const searched = search.trim() ? contacts.filter((c) => matchesQuery(c, search)) : contacts;
  const textableCount = searched.filter((c) => c.phone).length;
  const dripSequences = sequences.filter((s) => s.type === "drip");

  const groupLabel =
    groupBy === "none" ? "Everyone" : groupBy === "stage" ? "Grouped by stage" : groupBy === "tag" ? "Grouped by tag" : groupBy === "source" ? "Grouped by source" : "Grouped by month";

  return (
    <div className="px-4 py-5 md:hidden">
      {insideList ? (
        <InsideList
          listName={listLabel!}
          contacts={contacts}
          stages={stages}
          tags={tags}
          sequences={dripSequences}
          ownerId={ownerId}
          backHref="/contacts?view=my-lists"
        />
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-serif text-2xl font-semibold text-neutral-900">Contacts</p>
              <p className="mt-0.5 text-[13px] text-neutral-400">
                People and lists. Deal board:{" "}
                <Link href="/pipeline" className="font-medium text-brand-700">
                  Pipeline
                </Link>
              </p>
            </div>
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
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search name, email, phone"
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
            <>
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-[14px] text-neutral-500">
                  {groupLabel} · {textableCount} textable
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  <select
                    value={currentSort}
                    onChange={(e) => setSort(e.target.value)}
                    aria-label="Sort"
                    className="h-10 rounded-full border border-neutral-200 bg-white px-3 text-[13px] font-semibold text-neutral-700"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(true)}
                    className={cn(
                      "flex h-10 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold",
                      activeFilterCount > 0
                        ? "border-brand-300 bg-brand-50 text-brand-700"
                        : "border-neutral-200 bg-white text-neutral-700",
                    )}
                  >
                    <SlidersHorizontal size={14} /> Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
                  </button>
                </div>
              </div>
              <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5">
                {QUEUES.map((queue) => (
                  <button
                    key={queue.value}
                    type="button"
                    onClick={() => toggleQueue(queue.value)}
                    className={cn(
                      "h-9 shrink-0 whitespace-nowrap rounded-full border px-3 text-[13px] font-medium",
                      activeQueue === queue.value ? "border-brand-500 bg-brand-50 text-brand-700" : "border-neutral-200 text-neutral-600",
                    )}
                  >
                    {queue.label}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="mt-3">
            {view === "my-lists" ? (
              <MyLists
                contacts={contacts}
                eventNames={eventNames}
                registeredEventNames={registeredEventNames}
                leadSources={leadSources}
                segments={segments}
              />
            ) : (
              <PeopleList contacts={searched} stages={stages} ownerId={ownerId} groupBy={groupBy} lastActivityLabels={lastActivityLabels} />
            )}
          </div>
        </>
      )}

      {filtersOpen && (
        <ContactFiltersSheet
          stages={stages}
          tags={tags}
          leadSources={leadSources}
          eventNames={eventNames}
          registeredEventNames={registeredEventNames}
          onClose={() => setFiltersOpen(false)}
        />
      )}
    </div>
  );
}
