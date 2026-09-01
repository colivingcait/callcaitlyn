import { CheckCircle2, Circle } from "lucide-react";
import { formatLocal } from "@/lib/format-time";
import type { ContactEventEntry } from "@/lib/data/contact-events";

// Every meetup this contact has ever registered for or checked into, most
// recent first - the same registered/attended facts the Events page's
// roster cards show, just re-sliced to one contact instead of one event.
export function ContactEventHistory({ events }: { events: ContactEventEntry[] }) {
  if (events.length === 0) return <p className="px-[18px] py-4 text-[15px] text-neutral-400">No event history yet.</p>;

  return (
    <div className="divide-y divide-neutral-100">
      {events.map((e) => (
        <div key={e.key} className="flex items-center gap-3 px-[18px] py-3">
          {e.attended ? (
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          ) : (
            <Circle size={18} className="shrink-0 text-neutral-300" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-neutral-900">{e.label}</p>
            <p className="text-sm text-neutral-500">
              {formatLocal(e.date, "MMM d, yyyy")} · {e.seriesLabel}
            </p>
          </div>
          <span className={`shrink-0 text-sm font-semibold ${e.attended ? "text-emerald-700" : e.registered ? "text-neutral-500" : "text-neutral-400"}`}>
            {e.attended ? "Attended" : e.registered ? "Registered" : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}
