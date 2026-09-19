import { createClient } from "@/lib/supabase/server";
import { formatLocal } from "@/lib/format-time";
import { eventHasEnded, eventNoShowCount, eventWalkInCount } from "@/lib/crm/event-ended";

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
  return formatLocal(iso, "yyyy-MM-dd");
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
  // From the events table (see migration 0068) once this bucket is linked
  // to one - null for anything created before that table existed, or any
  // series with no matching row yet. hasEnded is timezone-aware
  // (America/New_York) and is false until the event's end; no-show
  // counts stay 0 until then.
  startsAt: string | null;
  endsAt: string | null;
  hasEnded: boolean;
};

export type EventsData = {
  events: EventEntry[];
  nextUp: EventEntry | null;
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

  const [{ data: activities }, { data: contacts }, { data: eventRecords }] = await Promise.all([
    supabase.from("activities").select("contact_id, source, occurred_at, metadata").in("source", ["eventbrite", "checkin", "jotform"]),
    supabase.from("contacts").select("id, first_name, last_name, email, phone").eq("archived", false),
    supabase.from("events").select("*").order("starts_at", { ascending: true }),
  ]);

  const eventRecordByEventbriteId = new Map((eventRecords ?? []).filter((e) => e.eventbrite_event_id).map((e) => [e.eventbrite_event_id as string, e]));
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
  // available signal per the priority in the Bucket type's comment above -
  // a real events-table row (see migration 0068) beats every proxy, since
  // it's an actual start time instead of an inference.
  type EventRecord = NonNullable<typeof eventRecords>[number];
  const records = eventRecords ?? [];
  const claimedRecordIds = new Set<string>();

  function localDay(iso: string | null | undefined): string | null {
    if (!iso) return null;
    return formatLocal(iso, "yyyy-MM-dd");
  }

  function findLinkedRecord(bucket: Bucket): EventRecord | undefined {
    if (bucket.eventId) {
      const byEb = eventRecordByEventbriteId.get(bucket.eventId);
      if (byEb && !claimedRecordIds.has(byEb.id)) return byEb;
    }
    const startDay = localDay(bucket.eventStart);
    if (startDay) {
      return records.find((e) => e.series === bucket.series && localDay(e.starts_at) === startDay && !claimedRecordIds.has(e.id));
    }
    return undefined;
  }

  const linkedByKey = new Map<string, EventRecord>();
  for (const b of byKey.values()) {
    const rec = findLinkedRecord(b);
    if (rec) {
      linkedByKey.set(b.key, rec);
      claimedRecordIds.add(rec.id);
    }
  }

  // Manual "New event" rows often have no Eventbrite id, so registrations
  // land in a separate bucket dated by signup time and used to show up
  // under Past. If this series has exactly one leftover future record and
  // one leftover registration-only bucket, they are the same meetup.
  for (const series of ["house_hacking", "womens_rei"] as EventSeries[]) {
    const leftoverRecords = records.filter((e) => e.series === series && !claimedRecordIds.has(e.id) && !eventHasEnded({ startsAt: e.starts_at, endsAt: e.ends_at }));
    const leftoverBuckets = [...byKey.values()].filter((b) => b.series === series && !linkedByKey.has(b.key) && !b.earliestCheckin);
    if (leftoverRecords.length === 1 && leftoverBuckets.length === 1) {
      linkedByKey.set(leftoverBuckets[0].key, leftoverRecords[0]);
      claimedRecordIds.add(leftoverRecords[0].id);
    }
  }

  const buckets = [...byKey.values()].map((b) => {
    const linkedEvent = linkedByKey.get(b.key);
    const startsAt = linkedEvent?.starts_at ?? b.eventStart ?? null;
    const endsAt = linkedEvent?.ends_at ?? null;
    return {
      ...b,
      sortKey: startsAt ?? b.earliestCheckin ?? b.earliestManualCheckin ?? b.earliestRegistration ?? "",
      startsAt,
      endsAt,
      hasEnded: eventHasEnded({ endsAt, startsAt }) || (!startsAt && !endsAt && eventHasEnded({ startsAt: b.earliestCheckin })),
    };
  });

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

      const hasEnded = bucket.hasEnded;
      const noShow = eventNoShowCount(hasEnded, bucket.registered, bucket.attended);
      const walkIn = eventWalkInCount(bucket.registered, bucket.attended);

      return {
        key: bucket.key,
        eventId: bucket.eventId,
        series: bucket.series,
        seriesLabel: SERIES_LABELS[bucket.series],
        label: bucket.label,
        date: bucket.sortKey,
        counts: { registered: bucket.registered.size, attended: bucket.attended.size, noShow, walkIn },
        people,
        startsAt: bucket.startsAt,
        endsAt: bucket.endsAt,
        hasEnded,
      };
    });

  // A brand-new event (the New event button, before anyone's registered)
  // has no activity yet at all, so it never got a bucket above - it still
  // needs to show as Next up. Any events-table row not already linked to
  // a bucket becomes an empty-roster entry instead of being invisible
  // until its first registration arrives.
  const phantomEntries: EventEntry[] = records
    .filter((e) => !claimedRecordIds.has(e.id))
    .map((e) => {
      const series: EventSeries = e.series === "womens_rei" ? "womens_rei" : "house_hacking";
      const hasEnded = eventHasEnded({ startsAt: e.starts_at, endsAt: e.ends_at });
      return {
        key: `record:${e.id}`,
        eventId: e.eventbrite_event_id,
        series,
        seriesLabel: SERIES_LABELS[series],
        label: e.name,
        date: e.starts_at,
        counts: { registered: 0, attended: 0, noShow: 0, walkIn: 0 },
        people: [],
        startsAt: e.starts_at,
        endsAt: e.ends_at,
        hasEnded,
      };
    });

  const allEvents = [...events, ...phantomEntries].sort((a, b) => b.date.localeCompare(a.date));

  const nextUp =
    allEvents
      .filter((e) => !e.hasEnded)
      .sort((a, b) => new Date(a.startsAt ?? a.date).getTime() - new Date(b.startsAt ?? b.date).getTime())[0] ?? null;

  const totalUniqueAttendees = new Set(checkIns.map((a) => a.contact_id)).size;
  const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const eventsInLastYear = allEvents.filter((e) => new Date(e.date).getTime() >= oneYearAgo && (!e.startsAt || new Date(e.startsAt).getTime() <= Date.now())).length;

  return { events: allEvents, nextUp, totalUniqueAttendees, eventsInLastYear };
}

// Same upcoming set the Events page uses (hasEnded = timezone-aware end
// of the event, not starts_at >= now). Today must share this so a meetup
// that /events shows as Next up cannot disappear from the home card.
export function upcomingEventsFromData(data: EventsData): EventEntry[] {
  const upcoming = data.events
    .filter((event) => !event.hasEnded)
    .sort((a, b) => new Date(a.startsAt ?? a.date).getTime() - new Date(b.startsAt ?? b.date).getTime());
  if (data.nextUp && !upcoming.some((event) => event.key === data.nextUp!.key)) {
    return [data.nextUp, ...upcoming];
  }
  return upcoming;
}
