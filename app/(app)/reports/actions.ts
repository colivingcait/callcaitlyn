"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { upsertActivity } from "@/lib/crm/activities";
import { recordEventAttendance } from "@/lib/crm/events";
import { addTagByName } from "@/lib/crm/find-or-create-contact";
import { sendCheckinRecapEmail } from "@/lib/checkin/send-recap-email";
import { SERIES_TAG, SERIES_LABEL } from "@/lib/checkin/process-checkin";
import type { EventSeriesKey } from "@/lib/crm/nearest-event";

// Manual override for the roster: someone Caitlyn saw in person but who
// never actually completed a check-in (missed the QR code, walked past the
// table). Treated identically to a real check-in in every way that
// matters - same "checkin" activity type (flagged manual: true), same
// recap email, same attendance recording - so nothing downstream (reports,
// the follow-up dialer) can tell the two apart.
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
  return { ok: true as const };
}
