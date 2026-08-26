import type { SupabaseClient } from "@supabase/supabase-js";
import { findOrCreateContact, addTagByName } from "@/lib/crm/find-or-create-contact";
import { upsertActivity } from "@/lib/crm/activities";
import { recordEventAttendance } from "@/lib/crm/events";
import { resolveNearestEbEvent, type EventSeriesKey } from "@/lib/crm/nearest-event";

export const SERIES_TAG: Record<EventSeriesKey, string> = { house_hacking: "House Hacking", womens_rei: "Women's REI" };
const SERIES_LABEL: Record<EventSeriesKey, string> = { house_hacking: "House Hacking Meetup", womens_rei: "Women's REI Meetup" };

export type CheckInInput = {
  // Set when the attendee was matched to an existing contact by name
  // search - enriches only genuinely-missing fields rather than
  // overwriting anything on file. Omitted means "not found", so a new
  // contact gets created from the fields below.
  contactId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  howHeard?: string;
};

export type CheckInResult = { ok: true; alreadyCheckedIn: boolean; contactId: string } | { ok: false; error: string };

// Shared by the QR check-in page's submit action - the only caller today,
// but kept as its own module (mirroring processJotformSubmission/
// processEventbriteOrder) since it's the same "find contact, tag, log
// activity, record attendance" shape as everything else.
export async function processCheckIn(
  admin: SupabaseClient,
  ownerId: string,
  series: EventSeriesKey,
  input: CheckInInput,
): Promise<CheckInResult> {
  const now = new Date().toISOString();
  const nearest = await resolveNearestEbEvent(admin, ownerId, series, now);
  const eventName = nearest.eventName ?? SERIES_LABEL[series];

  let contactId = input.contactId ?? null;

  if (contactId) {
    const { data: existing } = await admin.from("contacts").select("id, email, phone").eq("id", contactId).maybeSingle();
    if (!existing) return { ok: false, error: "That contact no longer exists - try searching again." };

    const patch: Record<string, string> = {};
    if (!existing.email && input.email) patch.email = input.email;
    if (!existing.phone && input.phone) patch.phone = input.phone;
    if (Object.keys(patch).length > 0) await admin.from("contacts").update(patch).eq("id", contactId);
  } else {
    const contact = await findOrCreateContact(admin, ownerId, {
      email: input.email,
      phone: input.phone,
      firstName: input.firstName,
      lastName: input.lastName,
      leadSource: input.howHeard || "Walk-in check-in",
      contactType: "attendee",
    });
    if (!contact) return { ok: false, error: "Email or phone is required" };
    contactId = contact.id;
  }

  await addTagByName(admin, ownerId, contactId, "Meetup");
  await addTagByName(admin, ownerId, contactId, SERIES_TAG[series]);

  // Falls back to today's date when no Eventbrite event has been matched
  // yet (e.g. the very first event before any registration exists) - still
  // dedupes same-day resubmissions, just without a real event_id to key on.
  const dedupeKey = `${contactId}:${nearest.eventId ?? now.slice(0, 10)}`;

  const activity = await upsertActivity(admin, ownerId, contactId, "checkin", "checkin_dedup_key", dedupeKey, {
    type: "meeting",
    direction: "none",
    occurred_at: now,
    body: `Checked in at ${eventName}`,
    metadata: {
      checkin_dedup_key: dedupeKey,
      series,
      event_id: nearest.eventId,
      event_name: eventName,
      how_heard: input.howHeard ?? null,
    },
  });

  await recordEventAttendance(admin, contactId, eventName, now);

  return { ok: true, alreadyCheckedIn: !activity.wasCreated, contactId };
}
