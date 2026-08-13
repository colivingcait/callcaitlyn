"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { X } from "lucide-react";
import { Button, Input, Select, Label } from "@/components/ui";
import { CONTACT_TYPE_LABELS, TIMELINE_LABELS, REPRESENTING_LABELS, cn } from "@/lib/utils";
import type { PipelineStage, Tag } from "@/types/database";
import type { ContactGroupBy } from "@/lib/crm/contact-filter-params";

const LEAD_DATE_PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "This year", days: 365 },
];

const GROUP_OPTIONS: { value: ContactGroupBy; label: string }[] = [
  { value: "none", label: "No grouping" },
  { value: "stage", label: "Stage" },
  { value: "tag", label: "Tag" },
  { value: "source", label: "Lead source" },
  { value: "month", label: "Lead month (cohort)" },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December",
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 border-b border-neutral-100 pb-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{title}</p>
      {children}
    </div>
  );
}

export function ContactFiltersSheet({
  stages,
  tags,
  leadSources,
  eventNames,
  onClose,
}: {
  stages: PipelineStage[];
  tags: Tag[];
  leadSources: string[];
  eventNames: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Local draft state, seeded from the URL - nothing is applied until
  // "Apply filters" so flipping through several fields doesn't trigger a
  // navigation (and a full contacts refetch) per click.
  const [draft, setDraft] = useState(() => Object.fromEntries(searchParams.entries()));
  const [selectedTags, setSelectedTags] = useState<string[]>(() => (searchParams.get("tags")?.split(",").filter(Boolean) ?? []));

  function set(key: string, value: string) {
    setDraft((prev) => {
      const next = { ...prev };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
  }

  function toggleTag(id: string) {
    setSelectedTags((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  function applyLeadDatePreset(days: number) {
    set("newSince", String(days));
    set("leadFrom", "");
    set("leadTo", "");
  }

  function apply() {
    const params = new URLSearchParams(draft);
    if (selectedTags.length) params.set("tags", selectedTags.join(","));
    else params.delete("tags");
    router.push(`${pathname}?${params.toString()}`);
    onClose();
  }

  function clearAll() {
    router.push(pathname);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4">
          <p className="font-serif text-xl font-semibold text-neutral-900">Filters</p>
          <button onClick={onClose} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <Section title="Group by">
            <Select value={draft.group ?? "none"} onChange={(e) => set("group", e.target.value)}>
              {GROUP_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Section>

          <Section title="Stage & type">
            <div className="grid grid-cols-2 gap-2">
              <Select value={draft.stage ?? ""} onChange={(e) => set("stage", e.target.value)}>
                <option value="">All stages</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
              <Select value={draft.type ?? ""} onChange={(e) => set("type", e.target.value)}>
                <option value="">All types</option>
                {Object.entries(CONTACT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          </Section>

          <Section title="Tags (any of)">
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTag(t.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium",
                    selectedTags.includes(t.id) ? "border-brand-500 bg-brand-50 text-brand-700" : "border-neutral-200 text-neutral-600",
                  )}
                >
                  {t.name}
                </button>
              ))}
              {tags.length === 0 && <p className="text-xs text-neutral-400">No tags yet.</p>}
            </div>
          </Section>

          <Section title="Source, timeline & side">
            <div className="grid grid-cols-2 gap-2">
              <Select value={draft.source ?? ""} onChange={(e) => set("source", e.target.value)}>
                <option value="">All sources</option>
                {leadSources.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              <Select value={draft.timeline ?? ""} onChange={(e) => set("timeline", e.target.value)}>
                <option value="">All timelines</option>
                {Object.entries(TIMELINE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <Select value={draft.representing ?? ""} onChange={(e) => set("representing", e.target.value)}>
                <option value="">Buyer/Seller (any)</option>
                {Object.entries(REPRESENTING_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <Select value={draft.likelihood ?? ""} onChange={(e) => set("likelihood", e.target.value)}>
                <option value="">Likelihood (any)</option>
                <option value="high">Hot</option>
                <option value="medium">Warm</option>
                <option value="low">Cold</option>
              </Select>
            </div>
          </Section>

          <Section title="Reachability">
            <div className="grid grid-cols-2 gap-2">
              <Select value={draft.phone ?? ""} onChange={(e) => set("phone", e.target.value)}>
                <option value="">Any phone</option>
                <option value="1">Has phone</option>
                <option value="0">No phone</option>
              </Select>
              <Select value={draft.email ?? ""} onChange={(e) => set("email", e.target.value)}>
                <option value="">Any email</option>
                <option value="1">Has email</option>
                <option value="0">No email</option>
              </Select>
            </div>
          </Section>

          <Section title="Follow-up & notes">
            <div className="grid grid-cols-2 gap-2">
              <Select value={draft.followup ?? ""} onChange={(e) => set("followup", e.target.value)}>
                <option value="">Follow-up (any)</option>
                <option value="1">Has follow-up set</option>
                <option value="0">No follow-up set</option>
                <option value="overdue">Overdue</option>
              </Select>
              <Select value={draft.notes ?? ""} onChange={(e) => set("notes", e.target.value)}>
                <option value="">Notes (any)</option>
                <option value="1">Has notes</option>
                <option value="0">No notes</option>
              </Select>
            </div>
          </Section>

          <Section title="Lead date">
            <div className="flex flex-wrap gap-1.5">
              {LEAD_DATE_PRESETS.map((p) => (
                <button
                  key={p.days}
                  type="button"
                  onClick={() => applyLeadDatePreset(p.days)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium",
                    draft.newSince === String(p.days) ? "border-brand-500 bg-brand-50 text-brand-700" : "border-neutral-200 text-neutral-600",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <Label className="text-xs">From</Label>
                <Input
                  type="date"
                  value={draft.leadFrom ?? ""}
                  onChange={(e) => {
                    set("leadFrom", e.target.value);
                    set("newSince", "");
                  }}
                />
              </div>
              <div>
                <Label className="text-xs">To</Label>
                <Input
                  type="date"
                  value={draft.leadTo ?? ""}
                  onChange={(e) => {
                    set("leadTo", e.target.value);
                    set("newSince", "");
                  }}
                />
              </div>
            </div>
          </Section>

          <Section title="Events">
            <Select value={draft.event ?? ""} onChange={(e) => set("event", e.target.value)}>
              <option value="">Any / no event attended</option>
              {eventNames.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </Select>
          </Section>

          <Section title="Personal details">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="City contains…" value={draft.city ?? ""} onChange={(e) => set("city", e.target.value)} />
              <Input placeholder="State contains…" value={draft.state ?? ""} onChange={(e) => set("state", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Select value={draft.birthdayMonth ?? ""} onChange={(e) => set("birthdayMonth", e.target.value)}>
                <option value="">Birthday: any month</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </Select>
              <Input
                type="number"
                placeholder="Min budget ($)"
                value={draft.minBudget ?? ""}
                onChange={(e) => set("minBudget", e.target.value)}
              />
            </div>
          </Section>

          <Section title="Data & status">
            <div className="grid grid-cols-2 gap-2">
              <Select value={draft.archived ?? "active"} onChange={(e) => set("archived", e.target.value)}>
                <option value="active">Active only</option>
                <option value="archived">Archived only</option>
                <option value="all">Active + archived</option>
              </Select>
              <Select value={draft.quoSync ?? ""} onChange={(e) => set("quoSync", e.target.value)}>
                <option value="">Quo sync (any)</option>
                <option value="0">Not synced to Quo</option>
              </Select>
            </div>
          </Section>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-neutral-100 px-5 py-4">
          <button onClick={clearAll} className="text-sm font-medium text-neutral-500 hover:text-neutral-700">
            Clear all
          </button>
          <Button onClick={apply}>Apply filters</Button>
        </div>
      </div>
    </div>
  );
}
