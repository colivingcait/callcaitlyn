import { Download } from "lucide-react";
import { getEventsData } from "@/lib/data/events";
import { EventRosterCard } from "@/components/events/EventRosterCard";
import { OlderEventRow } from "@/components/events/OlderEventRow";

const EXPANDED_COUNT = 6;

export default async function EventsPage() {
  const { events, totalUniqueAttendees, eventsInLastYear } = await getEventsData();
  const recent = events.slice(0, EXPANDED_COUNT);
  const older = events.slice(EXPANDED_COUNT);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-[28px]">Events</h1>
          <p className="mt-1 text-[15px] text-neutral-500">
            {totalUniqueAttendees} people have come to at least one. {eventsInLastYear} events in the last year.
          </p>
        </div>
        <a
          href="/api/events/export"
          className="flex items-center gap-1.5 rounded-[10px] border border-neutral-200 bg-white px-3.5 py-2 text-sm font-semibold text-neutral-800"
        >
          <Download size={15} /> Every event, one file
        </a>
      </div>

      {events.length === 0 ? (
        <p className="mt-6 text-[15px] text-neutral-400">No registrations or check-ins yet.</p>
      ) : (
        <>
          <div className="mt-5 space-y-3">
            {recent.map((event, i) => (
              <EventRosterCard
                key={event.key}
                event={event}
                defaultOpen={i === 0}
                otherEvents={events
                  .filter((e) => e.key !== event.key && e.eventId)
                  .map((e) => ({ eventId: e.eventId as string, label: e.label, date: e.date }))}
              />
            ))}
          </div>

          {older.length > 0 && (
            <div className="mt-5 overflow-hidden rounded-2xl border border-[#ebe9e7] bg-white">
              {older.map((event) => (
                <OlderEventRow key={event.key} event={event} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
