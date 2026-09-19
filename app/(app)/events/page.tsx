import Link from "next/link";
import { Download, Copy } from "lucide-react";
import { getEventsData } from "@/lib/data/events";
import { PrepCard } from "@/components/events/PrepCard";
import { NewEventButton } from "@/components/events/NewEventButton";
import { CombineDuplicateButton } from "@/components/events/CombineDuplicateButton";
import { formatLocal } from "@/lib/format-time";

export default async function EventsPage() {
  const { events, nextUp, totalUniqueAttendees, eventsInLastYear } = await getEventsData();

  // Duplicate listings surface up front instead of hiding behind a
  // per-card menu - the Eventbrite webhook double-firing is exactly why
  // two listings for the same real meetup end up a day (or less) apart,
  // each with its own eventId and its own slice of the real registrants.
  const past = events.filter((e) => e.hasEnded);
  const upcomingRest = events.filter((e) => !e.hasEnded && !(nextUp?.startsAt && e.key === nextUp.key));
  const duplicateGroups = new Map<string, typeof events>();
  for (const e of past) {
    if (!e.eventId) continue;
    const dayKey = `${e.series}:${e.date.slice(0, 10)}`;
    duplicateGroups.set(dayKey, [...(duplicateGroups.get(dayKey) ?? []), e]);
  }
  const duplicatePair = [...duplicateGroups.values()].find((group) => group.length >= 2);

  const firstTimerCount = nextUp
    ? (() => {
        const everAttended = new Set<string>();
        for (const e of past) {
          if (e.series !== nextUp.series) continue;
          for (const p of e.people) if (p.attended) everAttended.add(p.contactId);
        }
        return nextUp.people.filter((p) => p.registered && !everAttended.has(p.contactId)).length;
      })()
    : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-[28px]">Events</h1>
          <p className="mt-1 text-[15px] text-neutral-500">
            {totalUniqueAttendees} people have come to at least one. {eventsInLastYear} events in the last year.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <a
            href="/api/events/export"
            className="flex h-11 items-center gap-1.5 rounded-[10px] border border-neutral-200 bg-white px-3.5 text-sm font-semibold text-neutral-800"
          >
            <Download size={15} /> Every event, one file
          </a>
          <NewEventButton />
        </div>
      </div>

      {duplicatePair && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3.5">
          <Copy size={18} className="shrink-0 text-amber-700" />
          <p className="min-w-0 flex-1 text-[15px] leading-[21px] text-neutral-700">
            <span className="font-semibold text-neutral-900">
              Two listings for {formatLocal(duplicatePair[0].date, "MMMM d")}
            </span>{" "}
            — {duplicatePair.map((e) => e.counts.registered).join(" and ")} registrations. Eventbrite may have fired twice.
          </p>
          <CombineDuplicateButton events={duplicatePair.map((e) => ({ eventId: e.eventId as string, label: e.label, date: e.date }))} />
        </div>
      )}

      {nextUp?.startsAt && (
        <div className="mt-4">
          <PrepCard event={nextUp} firstTimerCount={firstTimerCount} />
        </div>
      )}

      {upcomingRest.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-[13px] font-semibold uppercase tracking-[.05em] text-neutral-400">Upcoming</p>
          <div className="space-y-2.5">
            {upcomingRest.map((event) => (
              <Link
                key={event.key}
                href={`/events/${encodeURIComponent(event.key)}`}
                className="flex items-center gap-3.5 rounded-2xl border border-[#ebe9e7] bg-white px-[18px] py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[17px] font-semibold text-neutral-900">{event.label}</p>
                  <p className="mt-0.5 text-[15px] text-neutral-600">
                    {formatLocal(event.startsAt ?? event.date, "EEEE, MMMM d")} · {event.seriesLabel}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-base font-semibold text-neutral-900">{event.counts.registered} registered</p>
                  <p className="text-sm text-neutral-500">No-shows after it ends</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 mb-2 text-[13px] font-semibold uppercase tracking-[.05em] text-neutral-400">Past events</p>
      {past.length === 0 ? (
        <p className="text-[15px] text-neutral-400">Nothing past yet — upcoming meetups stay above until they end.</p>
      ) : (
        <div className="space-y-2.5">
          {past.map((event) => {
            const showRate = event.counts.registered > 0 ? Math.round((event.counts.attended / event.counts.registered) * 100) : null;
            return (
              <Link
                key={event.key}
                href={`/events/${encodeURIComponent(event.key)}`}
                className="flex items-center gap-3.5 rounded-2xl border border-[#ebe9e7] bg-white px-[18px] py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[17px] font-semibold text-neutral-900">{event.label}</p>
                  <p className="mt-0.5 text-[15px] text-neutral-600">
                    {formatLocal(event.date, "EEEE, MMMM d")} · {event.seriesLabel}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-base font-semibold text-neutral-900">
                    {event.counts.attended} of {event.counts.registered}
                  </p>
                  <p className="text-sm text-neutral-500">{showRate !== null ? `${showRate}% showed` : "no registrations"}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
