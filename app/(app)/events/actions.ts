"use server";

import { revalidatePath } from "next/cache";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { classifySeries, eventKey, type EventSeries, type RawActivity } from "@/lib/data/events";
import { parseCrossEventOrdersCsv } from "@/lib/eventbrite/parse-orders-csv";
import { findOrCreateContact, addTagByName } from "@/lib/crm/find-or-create-contact";
import { upsertActivity } from "@/lib/crm/activities";
import { recordEventAttendance } from "@/lib/crm/events";
import { sendCheckinRecapEmail } from "@/lib/checkin/send-recap-email";
import { SERIES_TAG, SERIES_LABEL } from "@/lib/checkin/process-checkin";
import { APP_TIMEZONE } from "@/lib/format-time";
import type { EventSeriesKey } from "@/lib/crm/nearest-event";

// A real events-table row (see migration 0068) - what the Next up prep
// card, the New event button, and an honest post-event "Didn't come" all
// need. eventbriteEventId is left unset at creation (nothing to link to
// yet) and picked up automatically once getEventsData sees a matching
// registration - see lib/data/events.ts's eventRecordByEventbriteId.
export async function createEvent(input: {
  series: EventSeriesKey;
  name: string;
  startsAt: string;
  endsAt: string;
  location?: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };
  if (!input.name.trim()) return { ok: false as const, error: "Name this event" };

  function persistEventTime(value: string): string {
    const trimmed = value.trim();
    if (/[zZ]|[+-]\d{2}:\d{2}$/.test(trimmed)) return new Date(trimmed).toISOString();
    const local = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed) ? `${trimmed}:00` : trimmed;
    if (/^\d{4}-\d{2}-\d{2}T/.test(local)) return fromZonedTime(local, APP_TIMEZONE).toISOString();
    return new Date(trimmed).toISOString();
  }

  const startsAt = persistEventTime(input.startsAt);
  const endsAt = persistEventTime(input.endsAt);
  if (new Date(endsAt) <= new Date(startsAt)) return { ok: false as const, error: "End time has to be after the start time" };

  const { data, error } = await supabase
    .from("events")
    .insert({
      owner_id: user.id,
      series: input.series,
      name: input.name.trim(),
      starts_at: startsAt,
      ends_at: endsAt,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false as const, error: error?.message ?? "Couldn't create the event" };
  if (input.location?.trim()) {
    await supabase.from("events").update({ location: input.location.trim() }).eq("id", data.id);
  }

  revalidatePath("/events");
  revalidatePath("/");
  return { ok: true as const, id: data.id as string };
}

export async function saveEventCadence(input: {
  recordId: string | null;
  series: EventSeriesKey;
  name: string;
  startsAt: string;
  endsAt: string | null;
  eventbriteEventId: string | null;
  location: string | null;
  cadenceTextDaysBefore: number;
  cadenceShowOnToday: boolean;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };
  const days = Math.max(1, Math.round(input.cadenceTextDaysBefore) || 3);
  const patch = {
    location: input.location?.trim() || null,
    cadence_text_days_before: days,
    cadence_show_on_today: input.cadenceShowOnToday,
  };

  if (input.recordId) {
    const { error } = await supabase.from("events").update(patch).eq("id", input.recordId);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/events");
    revalidatePath("/");
    return { ok: true as const, id: input.recordId };
  }

  const startsAt = input.startsAt;
  const endsAt = input.endsAt && new Date(input.endsAt) > new Date(startsAt) ? input.endsAt : new Date(new Date(startsAt).getTime() + 2 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("events")
    .insert({
      owner_id: user.id,
      series: input.series,
      name: input.name.trim(),
      starts_at: startsAt,
      ends_at: endsAt,
      eventbrite_event_id: input.eventbriteEventId,
      ...patch,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false as const, error: error?.message ?? "Couldn't save cadence" };
  revalidatePath("/events");
  revalidatePath("/");
  return { ok: true as const, id: data.id as string };
}

export async function addEventRegistrant(input: {
  contactId: string;
  series: EventSeriesKey;
  eventId: string | null;
  eventName: string;
  eventStart: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const admin = createAdminClient();
  const { data: contact } = await admin.from("contacts").select("id").eq("id", input.contactId).maybeSingle();
  if (!contact) return { ok: false as const, error: "Contact not found" };

  const dedupeKey = `${input.contactId}:${input.eventId ?? input.eventStart.slice(0, 10)}:manual-reg`;
  await upsertActivity(admin, user.id, input.contactId, "eventbrite", "manual_registration_key", dedupeKey, {
    type: "meeting",
    direction: "none",
    occurred_at: input.eventStart,
    body: `Added to ${input.eventName} roster`,
    metadata: {
      manual_registration_key: dedupeKey,
      eventbrite_account: input.series,
      event_id: input.eventId,
      event_name: input.eventName,
      event_start: input.eventStart,
      manual: true,
    },
  });

  revalidatePath("/events");
  revalidatePath("/");
  return { ok: true as const };
}

// Manual override for the roster: someone she saw in person but who never
// actually completed a check-in (missed the QR code, walked past the
// table) - also what "Add a walk-in" on the live mobile check-in uses for
// a person who isn't even on the registration list. Treated identically
// to a real check-in in every way that matters - same "checkin" activity
// type (flagged manual: true), same recap email, same attendance
// recording - so nothing downstream (reports, the follow-up dialer) can
// tell the two apart.
export async function markContactAttended(contactId: string, series: EventSeriesKey, eventId: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: contact } = await admin.from("contacts").select("email, phone, first_name").eq("id", contactId).maybeSingle();
  if (!contact) return { ok: false as const, error: "Contact not found" };

  let eventName: string | null = null;
  if (eventId) {
    const { data } = await admin
      .from("activities")
      .select("metadata")
      .eq("owner_id", user.id)
      .eq("metadata->>event_id", eventId)
      .limit(1)
      .maybeSingle();
    const metadata = data?.metadata as Record<string, unknown> | undefined;
    eventName = typeof metadata?.event_name === "string" ? metadata.event_name : null;
  }
  eventName = eventName ?? SERIES_LABEL[series];

  await addTagByName(admin, user.id, contactId, "Meetup");
  await addTagByName(admin, user.id, contactId, SERIES_TAG[series]);

  const dedupeKey = `${contactId}:${eventId ?? now.slice(0, 10)}`;
  const activity = await upsertActivity(admin, user.id, contactId, "checkin", "checkin_dedup_key", dedupeKey, {
    type: "meeting",
    direction: "none",
    occurred_at: now,
    body: `Marked attended at ${eventName}`,
    metadata: { checkin_dedup_key: dedupeKey, series, event_id: eventId, event_name: eventName, manual: true },
  });

  await recordEventAttendance(admin, contactId, eventName, now);

  // Only on a genuine first mark, same gate the real check-in flow uses -
  // re-clicking Mark attended on someone already on the roster shouldn't
  // re-send the recap.
  if (activity.wasCreated) {
    await sendCheckinRecapEmail(admin, user.id, { id: contactId, email: contact.email, phone: contact.phone, first_name: contact.first_name }, series, eventName);
  }

  revalidatePath("/reports");
  revalidatePath("/events");
  revalidatePath("/dialer");
  return { ok: true as const };
}

// "Hold to undo" on the live mobile check-in - a mis-tap shouldn't need a
// trip to the roster to fix. Removes whatever check-in(s) this contact has
// for this event, real or manual; a genuine Eventbrite registration is
// untouched, so undoing a check-in just puts them back to "not checked in
// yet" rather than removing them from the event entirely.
export async function unmarkAttended(contactId: string, eventId: string | null): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const admin = createAdminClient();
  let query = admin.from("activities").delete().eq("owner_id", user.id).eq("contact_id", contactId).in("source", ["checkin", "jotform"]);
  if (eventId) query = query.eq("metadata->>event_id", eventId);
  const { error } = await query;
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/events");
  revalidatePath("/dialer");
  return { ok: true as const };
}

// For cleaning up a genuinely duplicate Eventbrite listing (two listings
// accidentally created for the same real meetup) - deletes every
// registration/check-in activity tied to that specific Eventbrite
// event_id. Deliberately doesn't touch the contacts themselves or their
// tags/sequence enrollment - someone who registered for a since-deleted
// duplicate listing is still a real person who showed interest, just
// without this one phantom roster entry. Only supports deletion by a
// real event_id (never the date-fallback bucket key), since deleting by
// date alone risks catching an unrelated event that happened to lack an
// event_id on the same day.
export async function deleteEventByEventId(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };
  if (!eventId) return { ok: false as const, error: "No event id to delete by" };

  const admin = createAdminClient();
  const { error, count } = await admin
    .from("activities")
    .delete({ count: "exact" })
    .eq("owner_id", user.id)
    .in("source", ["eventbrite", "checkin", "jotform"])
    .eq("metadata->>event_id", eventId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/events");
  revalidatePath("/reports");
  return { ok: true as const, deleted: count ?? 0 };
}

// For the more common case: two Eventbrite listings for the same real
// meetup (usually a cross-posting mistake between her House Hacking and
// Women's REI accounts) where both got real registrations, so deleting
// either would lose real people. Folds every activity tied to the
// duplicate (source) event_id into the canonical (target) one by
// rewriting its identifying metadata to match the target's - after this,
// both sets of registrants show up under one roster. Everything else on
// each row (order id, ticket type, manual-checkin flag, etc.) is left
// alone; only the fields that decide which bucket/series an activity
// lands in are touched.
export async function mergeEventInto(sourceEventId: string, targetEventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };
  if (!sourceEventId || !targetEventId) return { ok: false as const, error: "Missing event id" };
  if (sourceEventId === targetEventId) return { ok: false as const, error: "That's the same listing" };

  const admin = createAdminClient();

  const { data: targetSample, error: targetError } = await admin
    .from("activities")
    .select("metadata")
    .eq("owner_id", user.id)
    .in("source", ["eventbrite", "checkin", "jotform"])
    .eq("metadata->>event_id", targetEventId)
    .order("occurred_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (targetError) return { ok: false as const, error: targetError.message };
  if (!targetSample) return { ok: false as const, error: "Couldn't find the listing to combine into" };
  const targetMeta = (targetSample.metadata ?? {}) as Record<string, unknown>;

  const { data: sourceRows, error: sourceError } = await admin
    .from("activities")
    .select("id, metadata")
    .eq("owner_id", user.id)
    .in("source", ["eventbrite", "checkin", "jotform"])
    .eq("metadata->>event_id", sourceEventId);

  if (sourceError) return { ok: false as const, error: sourceError.message };
  if (!sourceRows || sourceRows.length === 0) return { ok: false as const, error: "No one registered on that listing" };

  for (const row of sourceRows) {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    const nextMeta: Record<string, unknown> = {
      ...meta,
      event_id: targetEventId,
      event_name: targetMeta.event_name ?? meta.event_name,
      event_start: targetMeta.event_start ?? meta.event_start,
    };
    if (typeof targetMeta.eventbrite_account === "string") nextMeta.eventbrite_account = targetMeta.eventbrite_account;
    if (typeof targetMeta.series === "string") nextMeta.series = targetMeta.series;

    const { error: updateError } = await admin.from("activities").update({ metadata: nextMeta }).eq("id", row.id);
    if (updateError) return { ok: false as const, error: updateError.message };
  }

  revalidatePath("/events");
  revalidatePath("/reports");
  return { ok: true as const, merged: sourceRows.length };
}

// For an event that has no real Eventbrite event_id at all - a stray
// walk-in/manual check-in with nothing else tying it to a real listing
// (the "1 of 0, no registrations, 1 walk-in" phantom events). Since
// there's no event_id to delete by, this recomputes the exact same
// series+key every activity would land in via getEventsData's own
// classifySeries/eventKey (imported, not re-implemented) and deletes
// whichever rows land on the given key - guaranteed to match what was
// actually shown on the card, since it's the same function computing it.
export async function deleteEventByKey(key: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };
  if (!key) return { ok: false as const, error: "No event to delete" };

  const admin = createAdminClient();
  const { data: activities, error } = await admin
    .from("activities")
    .select("id, contact_id, source, occurred_at, metadata")
    .eq("owner_id", user.id)
    .in("source", ["eventbrite", "checkin", "jotform"]);

  if (error) return { ok: false as const, error: error.message };

  const matchIds = (activities ?? [])
    .filter((a) => {
      const series = classifySeries(a as RawActivity);
      if (!series) return false;
      const eventId = typeof a.metadata?.event_id === "string" ? a.metadata.event_id : null;
      return eventKey(series, eventId, a.occurred_at) === key;
    })
    .map((a) => a.id);

  if (matchIds.length === 0) return { ok: false as const, error: "Couldn't find that event anymore" };

  const { error: deleteError, count } = await admin.from("activities").delete({ count: "exact" }).in("id", matchIds);
  if (deleteError) return { ok: false as const, error: deleteError.message };

  revalidatePath("/events");
  revalidatePath("/reports");
  return { ok: true as const, deleted: count ?? 0 };
}

// Imports Eventbrite's own "Orders" CSV export - the one place real event
// dates and every real registration actually live, since the live API has
// never returned a usable start time (fetchEventDetails) and the webhook
// has at least one confirmed gap (an entire 52-registration event that
// never arrived). This is deliberately the authoritative source: for every
// event_id it sees, it corrects any existing eventbrite row already tagged
// with the wrong account (the "which account processed the first
// registration" mislabel), and links up any stray same-day check-in that
// isn't tied to a real event yet - not just inserting new registrations.
// Reuses findOrCreateContact so this never creates a contact the app's own
// webhook path wouldn't have created for the same person.
export async function importEventbriteOrdersCsv(csvText: string, account: EventSeries) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const { rows, skipped } = parseCrossEventOrdersCsv(csvText);
  if (rows.length === 0) return { ok: false as const, error: "Couldn't find any valid order rows in that file" };

  const admin = createAdminClient();

  const eventInfoById = new Map<string, { eventName: string; eventStart: string }>();
  for (const row of rows) {
    if (!eventInfoById.has(row.eventId)) eventInfoById.set(row.eventId, { eventName: row.eventName, eventStart: row.eventStart });
  }

  let correctedExisting = 0;
  let relinkedWalkIns = 0;

  for (const [eventId, info] of eventInfoById) {
    const { data: existingEbRows } = await admin
      .from("activities")
      .select("id, metadata")
      .eq("owner_id", user.id)
      .eq("source", "eventbrite")
      .eq("metadata->>event_id", eventId);

    for (const row of existingEbRows ?? []) {
      const meta = (row.metadata ?? {}) as Record<string, unknown>;
      if (meta.eventbrite_account === account && meta.event_name === info.eventName && meta.event_start === info.eventStart) continue;
      await admin
        .from("activities")
        .update({ metadata: { ...meta, eventbrite_account: account, event_name: info.eventName, event_start: info.eventStart } })
        .eq("id", row.id);
      correctedExisting++;
    }

    // Any check-in/walk-in that happened on this event's real calendar day
    // (in the app's timezone) but was never linked to a real event_id -
    // exactly the shape of the phantom "House Hacking Meetup, no
    // registrations, N walk-ins" buckets - gets tied to the real event.
    const dayKey = formatInTimeZone(info.eventStart, APP_TIMEZONE, "yyyy-MM-dd");
    const dayStart = fromZonedTime(`${dayKey} 00:00:00`, APP_TIMEZONE);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const { data: strayCheckins } = await admin
      .from("activities")
      .select("id, metadata")
      .eq("owner_id", user.id)
      .in("source", ["checkin", "jotform"])
      .is("metadata->>event_id", null)
      .gte("occurred_at", dayStart.toISOString())
      .lt("occurred_at", dayEnd.toISOString());

    for (const row of strayCheckins ?? []) {
      const meta = (row.metadata ?? {}) as Record<string, unknown>;
      await admin
        .from("activities")
        .update({ metadata: { ...meta, event_id: eventId, event_name: info.eventName, event_start: info.eventStart, series: account } })
        .eq("id", row.id);
      relinkedWalkIns++;
    }
  }

  let created = 0;
  let matched = 0;
  let inserted = 0;
  let alreadyTracked = 0;
  let failed = 0;

  for (const row of rows) {
    const contact = await findOrCreateContact(admin, user.id, {
      email: row.buyerEmail,
      firstName: row.buyerFirstName,
      lastName: row.buyerLastName,
      leadSource: row.eventName,
      contactType: "attendee",
      leadDate: row.orderDate,
      skipQuoSync: true,
    });
    if (!contact) {
      failed++;
      continue;
    }
    if (contact.wasCreated) created++;
    else matched++;

    await addTagByName(admin, user.id, contact.id, "Meetup");
    if (account === "womens_rei") await addTagByName(admin, user.id, contact.id, "Women's REI");

    const { data: existingReg } = await admin
      .from("activities")
      .select("id")
      .eq("owner_id", user.id)
      .eq("contact_id", contact.id)
      .eq("source", "eventbrite")
      .eq("metadata->>event_id", row.eventId)
      .maybeSingle();
    if (existingReg) {
      alreadyTracked++;
      continue;
    }

    const info = eventInfoById.get(row.eventId)!;
    await upsertActivity(admin, user.id, contact.id, "eventbrite", "eventbrite_order_id", row.orderId, {
      type: "meeting",
      direction: "none",
      occurred_at: row.orderDate,
      body: `Registered for ${info.eventName} via Eventbrite`,
      metadata: {
        eventbrite_order_id: row.orderId,
        eventbrite_account: account,
        event_id: row.eventId,
        event_name: info.eventName,
        event_start: info.eventStart,
      },
    });
    inserted++;
  }

  revalidatePath("/events");
  revalidatePath("/reports");
  revalidatePath("/contacts");
  return {
    ok: true as const,
    events: eventInfoById.size,
    created,
    matched,
    inserted,
    alreadyTracked,
    correctedExisting,
    relinkedWalkIns,
    skipped,
    failed,
  };
}
