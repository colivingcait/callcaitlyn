"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { Download } from "lucide-react";
import type { EventRosterEntry, RosterPerson } from "@/lib/data/events-report";

type StatusFilter = "all" | "registered" | "attended" | "no_show" | "walk_in";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "registered", label: "Registered" },
  { value: "attended", label: "Attended" },
  { value: "no_show", label: "No-show" },
  { value: "walk_in", label: "Walk-in" },
];

function matchesFilter(p: RosterPerson, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "registered") return p.registered;
  if (filter === "attended") return p.attended;
  if (filter === "no_show") return p.registered && !p.attended;
  return p.attended && !p.registered; // walk_in
}

function csvField(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function rosterCsvDataUri(people: RosterPerson[]) {
  const header = ["Name", "Email", "Phone", "Registered", "Attended"].map(csvField).join(",");
  const rows = people.map((p) =>
    [p.name || "—", p.email ?? "", p.phone ?? "", p.registered ? "Yes" : "No", p.attended ? "Yes" : "No"].map(csvField).join(","),
  );
  const csv = [header, ...rows].join("\r\n");
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
}

function EventCard({ event }: { event: EventRosterEntry }) {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const filtered = event.people.filter((p) => matchesFilter(p, filter));

  const registeredCount = event.people.filter((p) => p.registered).length;
  const attendedCount = event.people.filter((p) => p.attended).length;
  const noShowCount = event.people.filter((p) => p.registered && !p.attended).length;
  const walkInCount = event.people.filter((p) => p.attended && !p.registered).length;
  const counts: Record<StatusFilter, number> = { all: event.people.length, registered: registeredCount, attended: attendedCount, no_show: noShowCount, walk_in: walkInCount };

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-neutral-800">{event.label}</p>
        <a
          href={rosterCsvDataUri(filtered)}
          download={`${event.label.replace(/[^\w-]+/g, "-")}-${filter}.csv`}
          className="flex shrink-0 items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
        >
          <Download size={13} /> Download CSV
        </a>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
              filter === opt.value ? "border-brand-500 bg-brand-50 text-brand-700" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            {opt.label} ({counts[opt.value]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-neutral-400">No one matches this filter.</p>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((p) => (
            <div key={p.contactId} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-t border-neutral-100 pt-1.5 text-xs first:border-t-0 first:pt-0">
              <span className="font-medium text-neutral-700">{p.name || "Unnamed"}</span>
              <span className="text-neutral-400">
                {[p.email, p.phone].filter(Boolean).join(" · ") || "No contact info"}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function EventRosterReport({ roster }: { roster: EventRosterEntry[] }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-neutral-700">Event roster (most recent 12 events)</h2>
      {roster.length === 0 ? (
        <p className="text-sm text-neutral-500">No registrations or check-ins yet.</p>
      ) : (
        <div className="space-y-3">
          {roster.map((event) => (
            <EventCard key={`${event.series}:${event.eventId ?? event.date}`} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
