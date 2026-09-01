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
