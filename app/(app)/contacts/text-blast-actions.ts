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

export type AttendanceStatus = "registered" | "attended" | "no_show" | "walk_in";

// Registered vs. attended aren't the same list - a meetup regularly gets
// walk-ins who never registered on Eventbrite, and registrants who don't
// show. Scoped to one specific event_id (not the recurring event name)
// since that's the only reliable way to mean "this exact night" - see
// lib/eventbrite/process-order.ts and lib/jotform/process-submission.ts
// for how event_id gets attached to both sides.
async function resolveOccurrenceAudience(
  admin: SupabaseClient,
  ownerId: string,
  eventId: string,
  status: AttendanceStatus,
): Promise<AudienceContact[]> {
  const [{ data: registrations }, { data: checkins }] = await Promise.all([
    admin.from("activities").select("contact_id").eq("owner_id", ownerId).eq("source", "eventbrite").eq("metadata->>event_id", eventId),
    // "checkin" is the QR check-in flow (current); "jotform" is the kiosk
    // it replaced - both counted so history from before the switch still
    // shows up as attended.
    admin
      .from("activities")
      .select("contact_id")
      .eq("owner_id", ownerId)
      .in("source", ["checkin", "jotform"])
      .eq("metadata->>event_id", eventId),
  ]);

  const registeredIds = new Set((registrations ?? []).map((r) => r.contact_id as string));
  const attendedIds = new Set((checkins ?? []).map((r) => r.contact_id as string));

  let contactIds: string[];
  if (status === "registered") contactIds = [...registeredIds];
  else if (status === "attended") contactIds = [...attendedIds];
  else if (status === "no_show") contactIds = [...registeredIds].filter((id) => !attendedIds.has(id));
  else contactIds = [...attendedIds].filter((id) => !registeredIds.has(id)); // walk_in

  if (contactIds.length === 0) return [];

  const { data: contacts } = await admin
    .from("contacts")
    .select("id, first_name, last_name, phone")
    .in("id", contactIds)
    .eq("archived", false)
    .not("phone", "is", null);

  return (contacts ?? []) as AudienceContact[];
}

export type EventOccurrence = { eventId: string; label: string };

// Distinct occurrences of a recurring event name, newest first - the
// registration dropdown only knows the event's name (which repeats every
// month), so this is what lets the blast UI target one specific night.
// Labeled with the event's real scheduled date (event_start) when a
// registration processed since that field started being captured has it;
// falls back to the earliest registration date on file otherwise.
export async function listEventOccurrences(eventName: string): Promise<EventOccurrence[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activities")
    .select("occurred_at, metadata")
    .eq("source", "eventbrite")
    .eq("metadata->>event_name", eventName)
    .order("occurred_at", { ascending: true });

  const byEventId = new Map<string, { start: string | null; earliestRegistration: string }>();
  for (const row of data ?? []) {
    const metadata = row.metadata as Record<string, unknown> | null;
    const eventId = typeof metadata?.event_id === "string" ? metadata.event_id : null;
    if (!eventId || byEventId.has(eventId)) continue;
    const start = typeof metadata?.event_start === "string" ? metadata.event_start : null;
    byEventId.set(eventId, { start, earliestRegistration: row.occurred_at });
  }

  const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
  return Array.from(byEventId.entries())
    .map(([eventId, { start, earliestRegistration }]) => ({
      eventId,
      label: start ? formatter.format(new Date(start)) : `Around ${formatter.format(new Date(earliestRegistration))}`,
      sortKey: start ?? earliestRegistration,
    }))
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
    .map(({ eventId, label }) => ({ eventId, label }));
}

export type EventAttendanceCounts = { registered: number; attended: number; noShow: number; walkIn: number };

export async function getEventAttendanceCounts(eventId: string): Promise<EventAttendanceCounts> {
  const supabase = await createClient();
  const [{ data: registrations }, { data: checkins }] = await Promise.all([
    supabase.from("activities").select("contact_id").eq("source", "eventbrite").eq("metadata->>event_id", eventId),
    supabase.from("activities").select("contact_id").in("source", ["checkin", "jotform"]).eq("metadata->>event_id", eventId),
  ]);

  const registeredIds = new Set((registrations ?? []).map((r) => r.contact_id as string));
  const attendedIds = new Set((checkins ?? []).map((r) => r.contact_id as string));

  return {
    registered: registeredIds.size,
    attended: attendedIds.size,
    noShow: [...registeredIds].filter((id) => !attendedIds.has(id)).length,
    walkIn: [...attendedIds].filter((id) => !registeredIds.has(id)).length,
  };
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

export async function getTextBlastAudiencePreview(
  eventName: string,
  registeredBefore?: string,
  occurrence?: { eventId: string; attendanceStatus: AttendanceStatus },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { count: 0, sample: [] as string[] };

  const admin = createAdminClient();
  const audience = occurrence
    ? await resolveOccurrenceAudience(admin, user.id, occurrence.eventId, occurrence.attendanceStatus)
    : await resolveEventAudience(admin, user.id, eventName, registeredBefore);
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
export async function createTextBlast(
  eventName: string,
  message: string,
  registeredBefore?: string,
  occurrence?: { eventId: string; attendanceStatus: AttendanceStatus },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };
  if (!eventName.trim()) return { ok: false as const, error: "Pick an event" };
  if (!message.trim()) return { ok: false as const, error: "Write a message" };

  const admin = createAdminClient();
  const audience = occurrence
    ? await resolveOccurrenceAudience(admin, user.id, occurrence.eventId, occurrence.attendanceStatus)
    : await resolveEventAudience(admin, user.id, eventName, registeredBefore);
  if (!audience.length) return { ok: false as const, error: "No one with a phone number on file matches that audience" };

  const { data: blast, error: blastError } = await admin
    .from("text_blasts")
    .insert({
      owner_id: user.id,
      event_name: eventName,
      message: message.trim(),
      event_id: occurrence?.eventId ?? null,
      attendance_status: occurrence?.attendanceStatus ?? null,
    })
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

// Requeues every failed recipient as pending and reopens the blast so the
// cron picks it back up - for exactly the "Quo ran out of credits, topped
// up, now catch up the ones that bounced" case, without re-sending to
// anyone who already got it.
export async function retryFailedTextBlastRecipients(blastId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const admin = createAdminClient();

  const { count } = await admin
    .from("text_blast_recipients")
    .update({ status: "pending", error: null }, { count: "exact" })
    .eq("blast_id", blastId)
    .eq("status", "failed");

  await admin.from("text_blasts").update({ status: "sending", completed_at: null }).eq("id", blastId).eq("owner_id", user.id);

  return { ok: true as const, retried: count ?? 0 };
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

// All-time history across every event, newest first - the Text tab's
// standalone home (moved out from under Contacts/one-event-at-a-time), so
// she can see and reopen any past send regardless of which event it was for.
export async function getAllTextBlasts(): Promise<TextBlastWithProgress[]> {
  const supabase = await createClient();
  const { data: blasts } = await supabase.from("text_blasts").select("*").order("created_at", { ascending: false }).limit(50);
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

export type TextBlastFailureGroup = { error: string; count: number; sample: { name: string; phone: string | null }[] };

// Grouped by the actual error text (rather than one row per person) so a
// systemic problem - the same Quo error on every failure - reads as one
// clear reason instead of a wall of identical-looking rows. sample caps at
// 5 names per group so a "who exactly" spot-check doesn't need a DB query.
export async function getTextBlastFailureDetails(blastId: string): Promise<TextBlastFailureGroup[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("text_blast_recipients")
    .select("error, contacts(first_name, last_name, phone)")
    .eq("blast_id", blastId)
    .eq("status", "failed");

  const groups = new Map<string, TextBlastFailureGroup>();
  for (const row of (rows ?? []) as unknown as { error: string | null; contacts: { first_name: string; last_name: string; phone: string | null } | null }[]) {
    const error = row.error ?? "Unknown error";
    const group = groups.get(error) ?? { error, count: 0, sample: [] };
    group.count++;
    if (group.sample.length < 5 && row.contacts) {
      group.sample.push({ name: [row.contacts.first_name, row.contacts.last_name].filter(Boolean).join(" "), phone: row.contacts.phone });
    }
    groups.set(error, group);
  }

  return Array.from(groups.values()).sort((a, b) => b.count - a.count);
}
