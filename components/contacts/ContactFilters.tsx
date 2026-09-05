"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, SlidersHorizontal, MessageSquare, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { QUEUES } from "@/lib/crm/contact-queues";
import { ContactFiltersSheet } from "@/components/contacts/ContactFiltersSheet";
import type { PipelineStage, Tag } from "@/types/database";

// Shared with PeopleMobile's sort control, so the phone view can offer the
// exact same options (including "Likelihood (hot first)," which used to
// only exist on desktop even though listContacts already computes it) -
// one list, not two that could drift.
export const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "updated_desc", label: "Recently updated" },
  { value: "created_desc", label: "Recently added" },
  { value: "created_asc", label: "Oldest added" },
  { value: "lead_date_desc", label: "Lead date (newest)" },
  { value: "lead_date_asc", label: "Lead date (oldest)" },
  { value: "name_asc", label: "Name (A-Z)" },
  { value: "name_desc", label: "Name (Z-A)" },
  { value: "follow_up_asc", label: "Follow-up date" },
  { value: "likelihood_desc", label: "Likelihood (hot first)" },
  { value: "tag_asc", label: "Tag (A-Z)" },
];

// Params the Filters sheet owns - anything else in the URL (q, sort, phone)
// has its own always-visible control, so it's excluded from the "how many
// filters are active" badge on the Filters button.
const SHEET_PARAM_KEYS = [
  "stage", "type", "tags", "source", "timeline", "representing", "likelihood",
  "email", "followup", "notes", "newSince", "leadFrom", "leadTo",
  "event", "city", "state", "birthdayMonth", "minBudget", "archived", "quoSync", "group",
];

export function ContactFilters({
  stages,
  tags,
  leadSources,
  eventNames,
  registeredEventNames,
}: {
  stages: PipelineStage[];
  tags: Tag[];
  leadSources: string[];
  eventNames: string[];
  registeredEventNames: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [, startTransition] = useTransition();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const activeFilterCount = SHEET_PARAM_KEYS.filter((k) => !!searchParams.get(k)).length;
  const activeQueue = searchParams.get("queue");
  const hasPhoneOnly = searchParams.get("phone") === "1";
  const currentSort = SORT_OPTIONS.find((o) => o.value === (searchParams.get("sort") ?? "updated_desc"));

  function toggleQueue(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (activeQueue === value) params.delete("queue");
    else params.set("queue", value);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function clearAll() {
    setQ("");
    startTransition(() => router.push(pathname));
  }

  const anyActive = activeFilterCount > 0 || hasPhoneOnly || !!activeQueue || !!searchParams.get("regEvent");

  return (
    <div className="space-y-2.5 border-b border-neutral-100 bg-white px-4 py-3.5 sm:px-0">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-[13px] top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              updateParam("q", e.target.value);
            }}
            placeholder="Search name, email, phone"
            className="w-full rounded-[11px] border border-neutral-200 bg-neutral-50 py-3 pl-10 pr-3 text-[15px] text-neutral-900"
          />
        </div>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-[11px] border px-3.5 py-3 text-[15px] font-medium",
            activeFilterCount > 0 ? "border-brand-500 bg-brand-50 text-brand-700" : "border-neutral-200 bg-white text-neutral-800",
          )}
        >
          <SlidersHorizontal size={16} className="text-neutral-500" /> Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </button>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setSortOpen((v) => !v)}
            className="flex items-center gap-2 rounded-[11px] border border-neutral-200 bg-white px-3.5 py-3 text-[15px] font-medium text-neutral-800"
          >
            {currentSort?.label ?? "Recent"} <ChevronDown size={15} className="text-neutral-400" />
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 max-h-72 w-56 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1 shadow-lg">
              {SORT_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => {
                    updateParam("sort", o.value);
                    setSortOpen(false);
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {registeredEventNames.length > 0 && (
        <select
          defaultValue={searchParams.get("regEvent") ?? ""}
          onChange={(e) => updateParam("regEvent", e.target.value)}
          className="w-full rounded-[11px] border border-neutral-200 bg-white px-3 py-2.5 text-[15px] text-neutral-800"
        >
          <option value="">Registered for: any event</option>
          {registeredEventNames.map((name) => (
            <option key={name} value={name}>
              Registered for: {name}
            </option>
          ))}
        </select>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => updateParam("phone", hasPhoneOnly ? "" : "1")}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full border py-1.5 pl-3.5 pr-2.5 text-sm font-medium",
            hasPhoneOnly ? "border-neutral-300 bg-neutral-100 text-neutral-800" : "border-neutral-200 text-neutral-600",
          )}
        >
          <MessageSquare size={14} className="text-neutral-500" /> Has a phone number
          {hasPhoneOnly && <X size={14} className="text-neutral-500" />}
        </button>
        {anyActive && (
          <button onClick={clearAll} className="text-sm font-medium text-neutral-500">
            Clear
          </button>
        )}
      </div>

      <div className="relative">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {QUEUES.map((queue) => (
            <button
              key={queue.value}
              type="button"
              onClick={() => toggleQueue(queue.value)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium",
                activeQueue === queue.value
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-neutral-200 text-neutral-600 hover:bg-neutral-50",
              )}
            >
              {queue.label}
            </button>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
      </div>
      {activeQueue && <p className="text-sm text-neutral-400">{QUEUES.find((q) => q.value === activeQueue)?.description}</p>}

      {sheetOpen && (
        <ContactFiltersSheet stages={stages} tags={tags} leadSources={leadSources} eventNames={eventNames} onClose={() => setSheetOpen(false)} />
      )}
    </div>
  );
}
