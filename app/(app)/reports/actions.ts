"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { upsertActivity } from "@/lib/crm/activities";
import { recordEventAttendance } from "@/lib/crm/events";
import { addTagByName } from "@/lib/crm/find-or-create-contact";
import { SERIES_TAG, SERIES_LABEL } from "@/lib/checkin/process-checkin";
import type { EventSeriesKey } from "@/lib/crm/nearest-event";

// Manual override for the roster: someone Caitlyn saw in person but who
// never actually completed a check-in (missed the QR code, walked past the
// table). Logs the same "checkin" activity type the real flows create, so
// the roster and every report treat them identically to a real check-in -
// just flagged manual: true in case that distinction ever matters later.
export async function markContactAttended(contactId: string, series: EventSeriesKey, eventId: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const admin = createAdminClient();
  const now = new Date().toISOString();

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
  await upsertActivity(admin, user.id, contactId, "checkin", "checkin_dedup_key", dedupeKey, {
    type: "meeting",
    direction: "none",
    occurred_at: now,
    body: `Marked attended at ${eventName}`,
    metadata: { checkin_dedup_key: dedupeKey, series, event_id: eventId, event_name: eventName, manual: true },
  });

  await recordEventAttendance(admin, contactId, eventName, now);

  revalidatePath("/reports/events");
  return { ok: true as const };
}
