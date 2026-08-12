import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivitySource, ActivityType, ActivityDirection } from "@/types/database";

// Shared across integrations: create or update an activity keyed by an
// external event id (stored in metadata), so re-delivered webhooks update
// the same row instead of duplicating it.
export async function upsertActivity(
  admin: SupabaseClient,
  ownerId: string,
  contactId: string,
  source: ActivitySource,
  idField: string,
  idValue: string | null,
  fields: {
    type: ActivityType;
    direction: ActivityDirection;
    occurred_at: string;
    body: string | null;
    metadata: Record<string, unknown>;
  },
) {
  if (idValue) {
    const { data: existing } = await admin
      .from("activities")
      .select("id")
      .eq("owner_id", ownerId)
      .eq("source", source)
      .eq(`metadata->>${idField}`, idValue)
      .maybeSingle();

    if (existing) {
      await admin.from("activities").update({ body: fields.body, metadata: fields.metadata }).eq("id", existing.id);
      return existing.id as string;
    }
  }

  const { data: created } = await admin
    .from("activities")
    .insert({
      owner_id: ownerId,
      contact_id: contactId,
      type: fields.type,
      direction: fields.direction,
      body: fields.body,
      occurred_at: fields.occurred_at,
      source,
      metadata: fields.metadata,
    })
    .select("id")
    .maybeSingle();

  return created?.id as string | undefined;
}

export async function patchActivityMetadata(
  admin: SupabaseClient,
  ownerId: string,
  source: ActivitySource,
  idField: string,
  idValue: string | null,
  patch: Record<string, unknown>,
) {
  if (!idValue) return null;
  const { data: existing } = await admin
    .from("activities")
    .select("id, contact_id, metadata, body, direction")
    .eq("owner_id", ownerId)
    .eq("source", source)
    .eq(`metadata->>${idField}`, idValue)
    .maybeSingle();

  if (!existing) return null;

  const nextMetadata = { ...(existing.metadata as Record<string, unknown>), ...patch };
  const summary = typeof patch.summary === "string" ? patch.summary : undefined;

  await admin
    .from("activities")
    .update({
      metadata: nextMetadata,
      body: summary ? `${existing.body ?? ""}${existing.body ? " · " : ""}${summary}` : existing.body,
    })
    .eq("id", existing.id);

  // Follow-up events (a transcript/summary/recording completing) don't
  // carry the original call's direction themselves - handing back the
  // original activity's so callers don't have to guess it from a payload
  // shape that doesn't actually include it.
  return { contactId: existing.contact_id as string, direction: existing.direction as ActivityDirection };
}
