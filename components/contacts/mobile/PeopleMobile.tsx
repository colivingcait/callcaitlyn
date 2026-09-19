"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { PeopleList } from "@/components/contacts/mobile/PeopleList";
import { ContactFiltersSheet } from "@/components/contacts/ContactFiltersSheet";
import { ContactsListTabs } from "@/components/contacts/ContactsListTabs";
import { ActiveFilterTags } from "@/components/contacts/ActiveFilterTags";
import { SORT_OPTIONS } from "@/components/contacts/ContactFilters";
import { CountScopeNote } from "@/components/CountScopeNote";
import { cn } from "@/lib/utils";
import type { ContactGroupBy } from "@/lib/crm/contact-filter-params";
import type { ContactWithRelations, PipelineStage, Tag, ContactSegment } from "@/types/database";

type SequenceOption = { id: string; name: string; type: string };
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
  sequences: _sequences,
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

  const urlGroup = searchParams.get("group");
  const groupBy: ContactGroupBy = GROUP_VALUES.includes(urlGroup as ContactGroupBy) ? (urlGroup as ContactGroupBy) : "none";

  const activeFilterCount = Array.from(searchParams.keys()).filter((k) => {
    if (["view", "list", "listName", "sort", "q"].includes(k)) return false;
    return true;
  }).length;
  const currentSort = searchParams.get("sort") ?? "updated_desc";

  function pushParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const qs = params.toString();
    router.push(qs ? `/contacts?${qs}` : "/contacts");
  }

  function setSort(value: string) {
    pushParams((params) => {
      if (value === "updated_desc") params.delete("sort");
      else params.set("sort", value);
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
  const groupLabel =
    groupBy === "none" ? "Everyone" : groupBy === "stage" ? "Grouped by stage" : groupBy === "tag" ? "Grouped by tag" : groupBy === "source" ? "Grouped by source" : "Grouped by month";

  return (
    <div className="px-4 py-5 lg:hidden">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-display text-[28px] font-semibold tracking-[-0.02em] text-neutral-900">Contacts</p>
              <p className="mt-0.5 text-[13px] text-neutral-400">
                {contacts.length} people · lists live here, not in More.{" "}
                <Link href="/pipeline" className="font-medium text-brand-700">
                  Pipeline
                </Link>
              </p>
              <CountScopeNote current="contacts" />
            </div>
            <div className="flex items-center gap-2">
              <Link href="/contacts/new" aria-label="New contact" className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white">
                <Plus size={20} />
              </Link>
            </div>
          </div>

          <ContactsListTabs segments={segments} ownerId={ownerId} />

          <div className="relative mt-3 mb-3">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search name, email, phone"
              className="h-[50px] w-full rounded-[14px] border border-neutral-200 pl-10 pr-3.5 text-[16px] text-neutral-900"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
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
          <div className="mt-3 flex flex-wrap gap-1.5">
            <ActiveFilterTags stages={stages} tags={tags} />
          </div>

          <div className="mt-3">
              <PeopleList contacts={searched} stages={stages} ownerId={ownerId} groupBy={groupBy} lastActivityLabels={lastActivityLabels} />
          </div>

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
