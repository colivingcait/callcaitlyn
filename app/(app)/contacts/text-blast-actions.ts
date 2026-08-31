"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendQuoText } from "@/lib/quo/send-message";
import { applyMergeFields, PREVIEW_CONTACT } from "@/lib/crm/merge-fields";
import { withProgress, tagBlastLabel, type TextBlastWithProgress } from "@/lib/crm/text-blasts";

type AudienceContact = { id: string; first_name: string; last_name: string; phone: string };
type AudienceResolution = { eligible: AudienceContact[]; optedOutCount: number };

// Split out from the id-in-list query every resolver below already runs -
// opted_out_at is fetched alongside instead of filtered in SQL, so "how
// many were excluded specifically for opting out" (the design brief's
// "84 registered, 81 can be texted, 3 opted out") is a plain count, not a
// second query. Consent recording (lib/crm/consent.ts) is enforcement
// input, not itself required here - a contact with no consent_at at all
// still receives an event-registration or tag blast the same as before;
// opted_out_at is the one flag that actually blocks a send.
function splitByOptOut(rows: (AudienceContact & { opted_out_at: string | null })[]): AudienceResolution {
  const eligible: AudienceContact[] = rows
    .filter((c) => !c.opted_out_at)
    .map((c) => ({ id: c.id, first_name: c.first_name, last_name: c.last_name, phone: c.phone }));
  return { eligible, optedOutCount: rows.length - eligible.length };
}

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
): Promise<AudienceResolution> {
  let query = admin
    .from("activities")
    .select("contact_id")
    .eq("owner_id", ownerId)
    .eq("source", "eventbrite")
    .eq("metadata->>event_name", eventName);
  if (registeredBefore) query = query.lt("occurred_at", registeredBefore);

  const { data: registrations } = await query;

  const contactIds = [...new Set((registrations ?? []).map((r) => r.contact_id as string))];
  if (contactIds.length === 0) return { eligible: [], optedOutCount: 0 };

  const { data: contacts } = await admin
    .from("contacts")
    .select("id, first_name, last_name, phone, opted_out_at")
    .in("id", contactIds)
    .eq("archived", false)
    .not("phone", "is", null);

  return splitByOptOut((contacts ?? []) as (AudienceContact & { opted_out_at: string | null })[]);
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
): Promise<AudienceResolution> {
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

  if (contactIds.length === 0) return { eligible: [], optedOutCount: 0 };

  const { data: contacts } = await admin
    .from("contacts")
    .select("id, first_name, last_name, phone, opted_out_at")
    .in("id", contactIds)
    .eq("archived", false)
    .not("phone", "is", null);

  return splitByOptOut((contacts ?? []) as (AudienceContact & { opted_out_at: string | null })[]);
}

// Not every bulk text is about a meetup registration - lets a blast reach
// everyone carrying a given tag instead (e.g. every "House Hacker", every
// "First-Time Buyer"), independent of event attendance entirely.
async function resolveTagAudience(admin: SupabaseClient, ownerId: string, tagId: string): Promise<AudienceResolution> {
  const { data: contactTags } = await admin.from("contact_tags").select("contact_id").eq("tag_id", tagId);
  const contactIds = [...new Set((contactTags ?? []).map((r) => r.contact_id as string))];
  if (contactIds.length === 0) return { eligible: [], optedOutCount: 0 };

  const { data: contacts } = await admin
    .from("contacts")
    .select("id, first_name, last_name, phone, opted_out_at")
    .in("id", contactIds)
    .eq("owner_id", ownerId)
    .eq("archived", false)
    .not("phone", "is", null);

  return splitByOptOut((contacts ?? []) as (AudienceContact & { opted_out_at: string | null })[]);
}

// Not every bulk text has an event or a tag behind it either - a filtered
// slice of the Contacts list, hand-picked via its checkbox selection.
async function resolveContactsAudience(admin: SupabaseClient, ownerId: string, contactIds: string[]): Promise<AudienceResolution> {
  if (contactIds.length === 0) return { eligible: [], optedOutCount: 0 };

  const { data: contacts } = await admin
    .from("contacts")
    .select("id, first_name, last_name, phone, opted_out_at")
    .in("id", contactIds)
    .eq("owner_id", ownerId)
    .eq("archived", false)
    .not("phone", "is", null);

  return splitByOptOut((contacts ?? []) as (AudienceContact & { opted_out_at: string | null })[]);
}

const RECENTLY_TEXTED_WINDOW_MS = 60 * 60 * 1000;

// Applied to every bulk-send audience (event, tag, or hand-picked contacts)
// right before it's shown or sent to - a contact who already got an
// outbound text in the last hour, from any source (an individual quick
// text, another blast), doesn't need the exact same reminder again a
// moment later. Matters most for the "text a few people individually,
// then bulk-blast the rest of the filtered list" workflow, where without
// this the bulk send would immediately re-text whoever she just handled
// by hand.
async function excludeRecentlyTexted(admin: SupabaseClient, ownerId: string, audience: AudienceContact[]): Promise<AudienceContact[]> {
  if (audience.length === 0) return audience;

  const cutoff = new Date(Date.now() - RECENTLY_TEXTED_WINDOW_MS).toISOString();
  const { data: recent } = await admin
    .from("activities")
    .select("contact_id")
    .eq("owner_id", ownerId)
    .eq("source", "quo")
    .eq("type", "text")
    .eq("direction", "outbound")
    .gte("occurred_at", cutoff)
    .in(
      "contact_id",
      audience.map((c) => c.id),
    );

  const recentlyTextedIds = new Set((recent ?? []).map((r) => r.contact_id as string));
  return audience.filter((c) => !recentlyTextedIds.has(c.id));
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

export type TextBlastRecipient = { id: string; name: string; phone: string; duplicatePhone: boolean; duplicateName: boolean };
export type TextBlastAudiencePreview = { count: number; recipients: TextBlastRecipient[]; optedOutCount: number };

// Full recipient list rather than a truncated sample - a "sending to 41
// people: Jamie, Alex +39 more" summary doesn't let her actually check who
// she's about to text, or catch two contact records that'd double-text the
// same real person before she hits send. duplicatePhone flags recipients
// who share a phone with another recipient in this same send (the send
// loop keys strictly off contact_id, so this WOULD fire twice); duplicateName
// flags a same-name collision even without a shared phone, since that's
// the more common shape a duplicate contact takes (re-entered with a typo'd
// or different number).
function buildAudiencePreview(audience: AudienceContact[], optedOutCount = 0): TextBlastAudiencePreview {
  const phoneCounts = new Map<string, number>();
  const nameCounts = new Map<string, number>();
  for (const c of audience) {
    phoneCounts.set(c.phone, (phoneCounts.get(c.phone) ?? 0) + 1);
    const normalizedName = `${c.first_name} ${c.last_name}`.trim().toLowerCase();
    nameCounts.set(normalizedName, (nameCounts.get(normalizedName) ?? 0) + 1);
  }

  const recipients = audience
    .map((c) => {
      const name = `${c.first_name} ${c.last_name}`.trim() || "Unnamed";
      return {
        id: c.id,
        name,
        phone: c.phone,
        duplicatePhone: (phoneCounts.get(c.phone) ?? 0) > 1,
        duplicateName: (nameCounts.get(name.toLowerCase()) ?? 0) > 1,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return { count: audience.length, recipients, optedOutCount };
}

export async function getTextBlastAudiencePreview(
  eventName: string,
  registeredBefore?: string,
  occurrence?: { eventId: string; attendanceStatus: AttendanceStatus },
): Promise<TextBlastAudiencePreview> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { count: 0, recipients: [], optedOutCount: 0 };

  const admin = createAdminClient();
  const { eligible, optedOutCount } = occurrence
    ? await resolveOccurrenceAudience(admin, user.id, occurrence.eventId, occurrence.attendanceStatus)
    : await resolveEventAudience(admin, user.id, eventName, registeredBefore);
  const audience = await excludeRecentlyTexted(admin, user.id, eligible);

  return buildAudiencePreview(audience, optedOutCount);
}

// What the compose modal is sending to - an event's registrants, a tag's
// members, or a hand-picked slice of the Contacts list. A discriminated
// union rather than a pile of optional props, so the modal can't be opened
// in an ambiguous half-configured state.
export type BlastTarget =
  | { kind: "event"; eventName: string }
  | { kind: "tag"; tagId: string; tagName: string }
  | { kind: "contacts"; contactIds: string[]; label: string };

export async function getTagAudiencePreview(tagId: string): Promise<TextBlastAudiencePreview> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { count: 0, recipients: [], optedOutCount: 0 };

  const admin = createAdminClient();
  const { eligible, optedOutCount } = await resolveTagAudience(admin, user.id, tagId);
  const audience = await excludeRecentlyTexted(admin, user.id, eligible);
  return buildAudiencePreview(audience, optedOutCount);
}

export async function createTagTextBlast(tagId: string, tagName: string, message: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };
  if (!message.trim()) return { ok: false as const, error: "Write a message" };

  const admin = createAdminClient();
  const { eligible } = await resolveTagAudience(admin, user.id, tagId);
  const audience = await excludeRecentlyTexted(admin, user.id, eligible);
  if (!audience.length) return { ok: false as const, error: "Everyone with that tag either has no phone on file, opted out, or was already texted in the last hour" };

  const { data: blast, error: blastError } = await admin
    .from("text_blasts")
    .insert({ owner_id: user.id, event_name: tagBlastLabel(tagName), message: message.trim(), tag_id: tagId })
    .select("id")
    .single();
  if (blastError || !blast) return { ok: false as const, error: blastError?.message ?? "Failed to create blast" };

  await admin.from("text_blast_recipients").insert(audience.map((c) => ({ blast_id: blast.id, contact_id: c.id })));

  return { ok: true as const, blastId: blast.id as string, recipientCount: audience.length };
}

export async function getContactsAudiencePreview(contactIds: string[]): Promise<TextBlastAudiencePreview> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { count: 0, recipients: [], optedOutCount: 0 };

  const admin = createAdminClient();
  const { eligible, optedOutCount } = await resolveContactsAudience(admin, user.id, contactIds);
  const audience = await excludeRecentlyTexted(admin, user.id, eligible);
  return buildAudiencePreview(audience, optedOutCount);
}

export async function createContactsTextBlast(contactIds: string[], label: string, message: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };
  if (!message.trim()) return { ok: false as const, error: "Write a message" };

  const admin = createAdminClient();
  const { eligible } = await resolveContactsAudience(admin, user.id, contactIds);
  const audience = await excludeRecentlyTexted(admin, user.id, eligible);
  if (!audience.length) return { ok: false as const, error: "Everyone selected either has no phone on file, opted out, or was already texted in the last hour" };

  const { data: blast, error: blastError } = await admin
    .from("text_blasts")
    .insert({ owner_id: user.id, event_name: label, message: message.trim() })
    .select("id")
    .single();
  if (blastError || !blast) return { ok: false as const, error: blastError?.message ?? "Failed to create blast" };

  await admin.from("text_blast_recipients").insert(audience.map((c) => ({ blast_id: blast.id, contact_id: c.id })));

  return { ok: true as const, blastId: blast.id as string, recipientCount: audience.length };
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
  const { eligible } = occurrence
    ? await resolveOccurrenceAudience(admin, user.id, occurrence.eventId, occurrence.attendanceStatus)
    : await resolveEventAudience(admin, user.id, eventName, registeredBefore);
  const audience = await excludeRecentlyTexted(admin, user.id, eligible);
  if (!audience.length) return { ok: false as const, error: "Everyone in that audience either has no phone on file, opted out, or was already texted in the last hour" };

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
