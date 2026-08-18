"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendQuoText } from "@/lib/quo/send-message";
import { applyMergeFields, PREVIEW_CONTACT } from "@/lib/crm/merge-fields";
import { withProgress, type TextBlastWithProgress } from "@/lib/crm/text-blasts";

type AudienceContact = { id: string; first_name: string; last_name: string; phone: string };

// Shared by the "how many will this reach" preview and the actual send, so
// the count she sees before sending is guaranteed to match who it actually
// goes to - the two paths can't drift apart the way the export route
// almost did before its filter logic got centralized.
//
// registeredBefore excludes anyone whose registration for this event
// happened at/after that cutoff - meetups recur under the same Eventbrite
// event name every month, so "registered for event X" alone pulls in
// EVERY occurrence's registrants ever, including someone who just signed
// up today for next month's date. Without this, a reminder about an event
// that already happened would also land on people who don't need a
// reminder yet (they registered for a future date, not the one being
// reminded about).
async function resolveEventAudience(
  admin: SupabaseClient,
  ownerId: string,
  eventName: string,
  registeredBefore?: string,
): Promise<AudienceContact[]> {
  let query = admin
    .from("activities")
    .select("contact_id")
    .eq("owner_id", ownerId)
    .eq("source", "eventbrite")
    .eq("metadata->>event_name", eventName);
  if (registeredBefore) query = query.lt("occurred_at", registeredBefore);

  const { data: registrations } = await query;

  const contactIds = [...new Set((registrations ?? []).map((r) => r.contact_id as string))];
  if (contactIds.length === 0) return [];

  const { data: contacts } = await admin
    .from("contacts")
    .select("id, first_name, last_name, phone")
    .in("id", contactIds)
    .eq("archived", false)
    .not("phone", "is", null);

  return (contacts ?? []) as AudienceContact[];
}

// Which Eventbrite account (womens_rei/house_hacking) this event belongs
// to, for picking the right meetup name in the reminder templates - same
// reliable signal used to fix the dialer's welcome-text mislabeling, not a
// guess off the event name text (see lib/crm/event-text-templates.ts).
export async function getEventAccount(eventName: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activities")
    .select("metadata")
    .eq("source", "eventbrite")
    .eq("metadata->>event_name", eventName)
    .limit(1)
    .maybeSingle();
  const metadata = data?.metadata as Record<string, unknown> | null;
  return typeof metadata?.eventbrite_account === "string" ? metadata.eventbrite_account : null;
}

export async function getTextBlastAudiencePreview(eventName: string, registeredBefore?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { count: 0, sample: [] as string[] };

  const admin = createAdminClient();
  const audience = await resolveEventAudience(admin, user.id, eventName, registeredBefore);
  const sample = audience.slice(0, 6).map((c) => c.first_name || "Unnamed");

  return { count: audience.length, sample };
}

export async function sendTestText(message: string, phone: string) {
  if (!phone.trim()) return { ok: false as const, error: "Enter a phone number" };
  if (!message.trim()) return { ok: false as const, error: "Write a message first" };

  const body = applyMergeFields(message, PREVIEW_CONTACT);
  const result = await sendQuoText(phone.trim(), body);
  if (!result.ok) return { ok: false as const, error: result.error };
  return { ok: true as const, sentBody: body };
}

// Recipients are snapshotted here, at creation time - not re-queried live
// by the sender - so a blast already trickling out doesn't silently pick
// up a new registration that comes in an hour into the send.
export async function createTextBlast(eventName: string, message: string, registeredBefore?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };
  if (!eventName.trim()) return { ok: false as const, error: "Pick an event" };
  if (!message.trim()) return { ok: false as const, error: "Write a message" };

  const admin = createAdminClient();
  const audience = await resolveEventAudience(admin, user.id, eventName, registeredBefore);
  if (!audience.length) return { ok: false as const, error: "No registrants with a phone number on file for that event" };

  const { data: blast, error: blastError } = await admin
    .from("text_blasts")
    .insert({ owner_id: user.id, event_name: eventName, message: message.trim() })
    .select("id")
    .single();
  if (blastError || !blast) return { ok: false as const, error: blastError?.message ?? "Failed to create blast" };

  await admin.from("text_blast_recipients").insert(audience.map((c) => ({ blast_id: blast.id, contact_id: c.id })));

  return { ok: true as const, blastId: blast.id as string, recipientCount: audience.length };
}

export async function cancelTextBlast(blastId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const admin = createAdminClient();
  await admin.from("text_blast_recipients").update({ status: "skipped" }).eq("blast_id", blastId).eq("status", "pending");
  await admin.from("text_blasts").update({ status: "canceled", completed_at: new Date().toISOString() }).eq("id", blastId).eq("owner_id", user.id);
}

export type { TextBlastWithProgress };

export async function getTextBlastsForEvent(eventName: string): Promise<TextBlastWithProgress[]> {
  const supabase = await createClient();
  const { data: blasts } = await supabase
    .from("text_blasts")
    .select("*")
    .eq("event_name", eventName)
    .order("created_at", { ascending: false })
    .limit(10);
  if (!blasts?.length) return [];

  const { data: recipients } = await supabase
    .from("text_blast_recipients")
    .select("blast_id, status")
    .in(
      "blast_id",
      blasts.map((b) => b.id),
    );

  return withProgress(blasts, recipients ?? []);
}
