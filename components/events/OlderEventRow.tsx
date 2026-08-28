import { formatLocal } from "@/lib/format-time";
import type { EventEntry } from "@/lib/data/events";

// Older events collapse to a plain one-line row rather than a full
// EventRosterCard - the roster is still one click away via the CSV
// export link, but expanding a table for every event ever run would
// defeat the point of a page that's supposed to answer "what happened
// most recently" at a glance.
export function OlderEventRow({ event }: { event: EventEntry }) {
  return (
    <a
      href={`/api/events/export?event=${encodeURIComponent(event.key)}`}
      className="flex items-center gap-3 border-b border-neutral-100 px-[18px] py-3 text-[15px] last:border-b-0"
    >
      <span className="min-w-0 flex-1 truncate font-medium text-neutral-800">{event.label}</span>
      <span className="shrink-0 text-neutral-500">{formatLocal(event.date, "MMM d, yyyy")}</span>
      <span className="shrink-0 text-neutral-400">
        {event.counts.attended} of {event.counts.registered}
        {event.counts.walkIn > 0 ? ` · ${event.counts.walkIn} walk-in${event.counts.walkIn === 1 ? "" : "s"}` : ""}
      </span>
    </a>
  );
}
