import { createClient } from "@/lib/supabase/server";

// Same series/keying conventions as lib/data/events-report.ts (kept
// separate rather than imported from there - that file mixes 10 unrelated
// report metrics into one giant pass; this one is roster-only and drops
// its 12-event cap). See that file's classifySeries comment for why a
// check-in's own `series` metadata field, not event_name text-matching, is
// the reliable signal.
export type EventSeries = "house_hacking" | "womens_rei";
const SERIES_LABELS: Record<EventSeries, string> = { house_hacking: "House Hacking", womens_rei: "Women's REI" };

// Exported so app/(app)/events/actions.ts's delete-by-key action can
// recompute the exact same bucket key for every activity and delete
// whichever ones land on the key it was given, instead of re-deriving a
// second, potentially-drifting copy of this classification logic in SQL.
export type RawActivity = { contact_id: string; source: string; occurred_at: string; metadata: Record<string, unknown> | null };

export function classifySeries(a: RawActivity): EventSeries | null {
  if (a.source === "eventbrite") {
    const account = a.metadata?.eventbrite_account;
    if (account === "womens_rei") return "womens_rei";
    if (account === "house_hacking") return "house_hacking";
    return null;
  }
  if (a.source === "checkin" || a.source === "jotform") {
    const series = a.metadata?.series;
    if (series === "womens_rei") return "womens_rei";
    if (series === "house_hacking") return "house_hacking";
    const name = a.metadata?.event_name;
    if (name === "Women's REI Meetup") return "womens_rei";
    if (name === "House Hacking Meetup") return "house_hacking";
    return null;
  }
  return null;
}

export function dateKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

export type RosterPerson = {
  contactId: string;
  name: string;
  email: string | null;
  phone: string | null;
  registered: boolean;
  attended: boolean;
  // This contact's Nth check-in in this series, counting this event - 1
  // means first time. Computed by walking every event for the series in
  // date order; registrations don't count toward this, only an actual
  // check-in does. 0 when the contact didn't actually attend (registered
  // only, or attendance not yet marked).
  attendanceNumber: number;
};

export type EventCounts = { registered: number; attended: number; noShow: number; walkIn: number };

export type EventEntry = {
  key: string;
  eventId: string | null;
  series: EventSeries;
  seriesLabel: string;
  label: string;
  date: string;
  counts: EventCounts;
  people: RosterPerson[];
};

export type EventsData = {
  events: EventEntry[];
  totalUniqueAttendees: number;
  eventsInLastYear: number;
};

export function eventKey(series: EventSeries, eventId: string | null, occurredAt: string): string {
  return eventId ? `${series}:${eventId}` : `${series}:date:${dateKey(occurredAt)}`;
}

function eventLabel(series: EventSeries, metadata: Record<string, unknown> | null, occurredAt: string): string {
  const eventName = typeof metadata?.event_name === "string" ? metadata.event_name : null;
  if (eventName) return eventName;
  const eventStart = typeof metadata?.event_start === "string" ? metadata.event_start : null;
  const dateLabel = new Date(eventStart ?? occurredAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${SERIES_LABELS[series]} — ${dateLabel}`;
}

// Every event, newest first, full roster (not capped at 12 like the
// Reports version this was lifted from) - fine at this data size, same
// standing convention as fetchActivityAggregates/getDuplicateRiskPairs.
export async function getEventsData(): Promise<EventsData> {
  const supabase = await createClient();

  const [{ data: activities }, { data: contacts }] = await Promise.all([
    supabase.from("activities").select("contact_id, source, occurred_at, metadata").in("source", ["eventbrite", "checkin", "jotform"]),
    supabase.from("contacts").select("id, first_name, last_name, email, phone").eq("archived", false),
  ]);

  const contactById = new Map((contacts ?? []).map((c) => [c.id, c]));
  const rows = (activities ?? []) as RawActivity[];
  const registrations = rows.filter((a) => a.source === "eventbrite" && contactById.has(a.contact_id));
  const checkIns = rows.filter((a) => (a.source === "checkin" || a.source === "jotform") && contactById.has(a.contact_id));

  type Bucket = {
    key: string;
    eventId: string | null;
    series: EventSeries;
    label: string;
    // Real Eventbrite start times have never actually come back from
    // their API (see lib/eventbrite/client.ts's fetchEventDetails) - in
    // its absence, the least-wrong proxy for "when did this event
    // actually happen" is the earliest kiosk/QR check-in, since those
    // only ever get logged live, on the real day. Registration dates
    // (which trickle in over the weeks before) and manual "Mark
    // attended" clicks (metadata.manual - logged whenever someone
    // reviews the roster after the fact, which can be days or weeks
    // later) are both worse proxies and are only used as a last resort,
    // and always by their EARLIEST occurrence, never their latest - a
    // late retroactive mark should never be able to drag a whole
    // event's date forward.
    eventStart: string | null;
    earliestCheckin: string | null;
    earliestManualCheckin: string | null;
    earliestRegistration: string | null;
    registered: Set<string>;
    attended: Set<string>;
  };
  const byKey = new Map<string, Bucket>();

  function newBucket(key: string, eventId: string | null, series: EventSeries, label: string): Bucket {
    return {
      key,
      eventId,
      series,
      label,
      eventStart: null,
      earliestCheckin: null,
      earliestManualCheckin: null,
      earliestRegistration: null,
      registered: new Set(),
      attended: new Set(),
    };
  }

  function noteEventStart(bucket: Bucket, metadata: Record<string, unknown> | null) {
    const start = typeof metadata?.event_start === "string" ? metadata.event_start : null;
    if (start && (!bucket.eventStart || start < bucket.eventStart)) bucket.eventStart = start;
  }

  for (const a of registrations) {
    const series = classifySeries(a);
    if (!series) continue;
    const eventId = typeof a.metadata?.event_id === "string" ? a.metadata.event_id : null;
    const key = eventKey(series, eventId, a.occurred_at);
    if (!byKey.has(key)) {
      byKey.set(key, newBucket(key, eventId, series, eventLabel(series, a.metadata, a.occurred_at)));
    }
    const bucket = byKey.get(key)!;
    bucket.registered.add(a.contact_id);
    if (!bucket.earliestRegistration || a.occurred_at < bucket.earliestRegistration) bucket.earliestRegistration = a.occurred_at;
    noteEventStart(bucket, a.metadata);
  }
  for (const a of checkIns) {
    const series = classifySeries(a);
    if (!series) continue;
    const eventId = typeof a.metadata?.event_id === "string" ? a.metadata.event_id : null;
    const key = eventKey(series, eventId, a.occurred_at);
    const isManual = a.metadata?.manual === true;
    let bucket = byKey.get(key);
    if (!bucket) {
      bucket = newBucket(key, eventId, series, eventLabel(series, a.metadata, a.occurred_at));
      byKey.set(key, bucket);
    }
    bucket.attended.add(a.contact_id);
    if (isManual) {
      if (!bucket.earliestManualCheckin || a.occurred_at < bucket.earliestManualCheckin) bucket.earliestManualCheckin = a.occurred_at;
    } else if (!bucket.earliestCheckin || a.occurred_at < bucket.earliestCheckin) {
      bucket.earliestCheckin = a.occurred_at;
    }
    noteEventStart(bucket, a.metadata);
  }

  // sortKey (used both for the displayed date and for numbering each
  // contact's Nth attendance in chronological order) picks the best
  // available signal per the priority in the Bucket type's comment above.
  const buckets = [...byKey.values()].map((b) => ({
    ...b,
    sortKey: b.eventStart ?? b.earliestCheckin ?? b.earliestManualCheckin ?? b.earliestRegistration ?? "",
  }));

  // Walk each series' buckets oldest-first to number each contact's
  // attendances, then re-sort newest-first for display.
  const attendanceCountBySeries = new Map<EventSeries, Map<string, number>>();
  const ascending = [...buckets].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  const attendanceNumberByBucketKey = new Map<string, Map<string, number>>();
  for (const bucket of ascending) {
    const counts = attendanceCountBySeries.get(bucket.series) ?? new Map<string, number>();
    const numbers = new Map<string, number>();
    for (const id of bucket.attended) {
      const n = (counts.get(id) ?? 0) + 1;
      numbers.set(id, n);
      counts.set(id, n);
    }
    attendanceNumberByBucketKey.set(bucket.key, numbers);
    attendanceCountBySeries.set(bucket.series, counts);
  }

  const events: EventEntry[] = buckets
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
    .map((bucket) => {
      const attendanceNumbers = attendanceNumberByBucketKey.get(bucket.key) ?? new Map<string, number>();
      const contactIds = new Set([...bucket.registered, ...bucket.attended]);
      const people: RosterPerson[] = [...contactIds]
        .map((id) => {
          const c = contactById.get(id);
          if (!c) return null;
          return {
            contactId: c.id,
            name: `${c.first_name} ${c.last_name}`.trim(),
            email: c.email,
            phone: c.phone,
            registered: bucket.registered.has(id),
            attended: bucket.attended.has(id),
            attendanceNumber: attendanceNumbers.get(id) ?? 0,
          };
        })
        .filter((p): p is RosterPerson => !!p)
        .sort((a, b) => a.name.localeCompare(b.name));

      const noShow = [...bucket.registered].filter((id) => !bucket.attended.has(id)).length;
      const walkIn = [...bucket.attended].filter((id) => !bucket.registered.has(id)).length;

      return {
        key: bucket.key,
        eventId: bucket.eventId,
        series: bucket.series,
        seriesLabel: SERIES_LABELS[bucket.series],
        label: bucket.label,
        date: bucket.sortKey,
        counts: { registered: bucket.registered.size, attended: bucket.attended.size, noShow, walkIn },
        people,
      };
    });

  const totalUniqueAttendees = new Set(checkIns.map((a) => a.contact_id)).size;
  const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const eventsInLastYear = events.filter((e) => new Date(e.date).getTime() >= oneYearAgo).length;

  return { events, totalUniqueAttendees, eventsInLastYear };
}
