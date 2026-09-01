import { createClient } from "@/lib/supabase/server";
import { classifySeries, eventKey, type RawActivity, type EventSeries } from "@/lib/data/events";

// Same classification/keying as getEventsData (lib/data/events.ts), just
// scoped to one contact instead of every contact - so a contact's event
// history always agrees with what the Events page itself shows for the
// same event, rather than a second implementation that could drift.
const SERIES_LABELS: Record<EventSeries, string> = { house_hacking: "House Hacking", womens_rei: "Women's REI" };

export type ContactEventEntry = {
  key: string;
  series: EventSeries;
  seriesLabel: string;
  label: string;
  date: string;
  registered: boolean;
  attended: boolean;
};

export async function getContactEventHistory(contactId: string): Promise<ContactEventEntry[]> {
  const supabase = await createClient();
  const { data: activities } = await supabase
    .from("activities")
    .select("contact_id, source, occurred_at, metadata")
    .eq("contact_id", contactId)
    .in("source", ["eventbrite", "checkin", "jotform"]);

  type Working = {
    key: string;
    series: EventSeries;
    eventName: string | null;
    eventStart: string | null;
    earliestOccurred: string;
    registered: boolean;
    attended: boolean;
  };
  const byKey = new Map<string, Working>();

  for (const a of (activities ?? []) as RawActivity[]) {
    const series = classifySeries(a);
    if (!series) continue;
    const eventId = typeof a.metadata?.event_id === "string" ? a.metadata.event_id : null;
    const key = eventKey(series, eventId, a.occurred_at);
    const eventName = typeof a.metadata?.event_name === "string" ? a.metadata.event_name : null;
    const eventStart = typeof a.metadata?.event_start === "string" ? a.metadata.event_start : null;

    const entry = byKey.get(key) ?? {
      key,
      series,
      eventName: null,
      eventStart: null,
      earliestOccurred: a.occurred_at,
      registered: false,
      attended: false,
    };
    if (eventName) entry.eventName = eventName;
    if (eventStart && (!entry.eventStart || eventStart < entry.eventStart)) entry.eventStart = eventStart;
    if (a.occurred_at < entry.earliestOccurred) entry.earliestOccurred = a.occurred_at;
    if (a.source === "eventbrite") entry.registered = true;
    else entry.attended = true;
    byKey.set(key, entry);
  }

  return [...byKey.values()]
    .map((e) => ({
      key: e.key,
      series: e.series,
      seriesLabel: SERIES_LABELS[e.series],
      label: e.eventName ?? `${SERIES_LABELS[e.series]} meetup`,
      date: e.eventStart ?? e.earliestOccurred,
      registered: e.registered,
      attended: e.attended,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}
