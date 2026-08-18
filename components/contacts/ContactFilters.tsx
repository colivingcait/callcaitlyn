"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, SlidersHorizontal, MessageSquareText } from "lucide-react";
import { Input, Select, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { QUEUES } from "@/lib/crm/contact-queues";
import { ContactFiltersSheet } from "@/components/contacts/ContactFiltersSheet";
import { TextBlastModal } from "@/components/contacts/TextBlastModal";
import type { PipelineStage, Tag } from "@/types/database";

const SORT_OPTIONS: { value: string; label: string }[] = [
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

// Params the Filters sheet owns - anything else in the URL (q, sort) has
// its own always-visible control, so it's excluded from the "how many
// filters are active" badge on the Filters button.
const SHEET_PARAM_KEYS = [
  "stage", "type", "tags", "source", "timeline", "representing", "likelihood",
  "phone", "email", "followup", "notes", "newSince", "leadFrom", "leadTo",
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
  // Lets a link elsewhere (the Dashboard's in-progress blast card) jump
  // straight into the compose modal instead of landing on the filtered
  // list and making her click Text again.
  const [textBlastOpen, setTextBlastOpen] = useState(() => searchParams.get("openBlast") === "1");
  const [, startTransition] = useTransition();
  const registeredEvent = searchParams.get("regEvent");

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const activeFilterCount = SHEET_PARAM_KEYS.filter((k) => !!searchParams.get(k)).length;
  const activeQueue = searchParams.get("queue");

  function toggleQueue(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (activeQueue === value) params.delete("queue");
    else params.set("queue", value);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="space-y-2.5 border-b border-neutral-100 bg-white px-4 py-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            updateParam("q", e.target.value);
          }}
          placeholder="Search name, email, phone…"
          className="pl-10"
        />
      </div>

      {registeredEventNames.length > 0 && (
        <div className="flex gap-2">
          <Select
            className="min-w-0 flex-1"
            defaultValue={searchParams.get("regEvent") ?? ""}
            onChange={(e) => updateParam("regEvent", e.target.value)}
          >
            <option value="">Registered for: any event</option>
            {registeredEventNames.map((name) => (
              <option key={name} value={name}>
                Registered for: {name}
              </option>
            ))}
          </Select>
          {registeredEvent && (
            <Button variant="secondary" size="md" className="shrink-0" onClick={() => setTextBlastOpen(true)}>
              <MessageSquareText size={15} /> Text
            </Button>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Select
          className="min-w-0 flex-1"
          defaultValue={searchParams.get("sort") ?? "updated_desc"}
          onChange={(e) => updateParam("sort", e.target.value)}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              Sort: {o.label}
            </option>
          ))}
        </Select>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-sm font-medium",
            activeFilterCount > 0 ? "border-brand-500 bg-brand-50 text-brand-700" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50",
          )}
        >
          <SlidersHorizontal size={14} /> Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </button>
      </div>

      <div className="relative">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {QUEUES.map((queue) => (
            <button
              key={queue.value}
              type="button"
              onClick={() => toggleQueue(queue.value)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium",
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
      {activeQueue && (
        <p className="text-xs text-neutral-400">{QUEUES.find((q) => q.value === activeQueue)?.description}</p>
      )}

      {sheetOpen && (
        <ContactFiltersSheet stages={stages} tags={tags} leadSources={leadSources} eventNames={eventNames} onClose={() => setSheetOpen(false)} />
      )}
      {textBlastOpen && registeredEvent && (
        <TextBlastModal eventName={registeredEvent} onClose={() => setTextBlastOpen(false)} />
      )}
    </div>
  );
}
