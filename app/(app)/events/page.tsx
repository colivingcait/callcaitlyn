import { Copy } from "lucide-react";
import { getEventsData } from "@/lib/data/events";
import { EventsHub } from "@/components/events/EventsHub";
import { CombineDuplicateButton } from "@/components/events/CombineDuplicateButton";
import { formatLocal } from "@/lib/format-time";

export default async function EventsPage() {
  const { events } = await getEventsData();

  // Duplicate listings surface up front instead of hiding behind a
  // per-card menu - the Eventbrite webhook double-firing is exactly why
  // two listings for the same real meetup end up a day (or less) apart,
  // each with its own eventId and its own slice of the real registrants.
  const past = events.filter((e) => e.hasEnded);
  const upcoming = events
    .filter((e) => !e.hasEnded)
    .sort((a, b) => new Date(a.startsAt ?? a.date).getTime() - new Date(b.startsAt ?? b.date).getTime());
  const duplicateGroups = new Map<string, typeof events>();
  for (const e of past) {
    if (!e.eventId) continue;
    const dayKey = `${e.series}:${e.date.slice(0, 10)}`;
    duplicateGroups.set(dayKey, [...(duplicateGroups.get(dayKey) ?? []), e]);
  }
  const duplicatePair = [...duplicateGroups.values()].find((group) => group.length >= 2);

  return (
    <div>
      {duplicatePair && (
        <div className="mx-auto w-full max-w-[1400px] px-4 pt-6 lg:px-8">
          <div className="flex items-center gap-3 rounded-2xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3.5">
            <Copy size={18} className="shrink-0 text-amber-700" />
            <p className="min-w-0 flex-1 text-[15px] leading-[21px] text-neutral-700">
              <span className="font-semibold text-neutral-900">Two listings for {formatLocal(duplicatePair[0].date, "MMMM d")}</span>{" "}
              — {duplicatePair.map((e) => e.counts.registered).join(" and ")} registrations. Eventbrite may have fired twice.
            </p>
            <CombineDuplicateButton events={duplicatePair.map((e) => ({ eventId: e.eventId as string, label: e.label, date: e.date }))} />
          </div>
        </div>
      )}
      <EventsHub upcoming={upcoming} past={past} />
    </div>
  );
}
