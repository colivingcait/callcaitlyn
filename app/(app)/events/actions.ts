"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
