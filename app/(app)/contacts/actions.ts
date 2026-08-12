"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendQuoText } from "@/lib/quo/send-message";
import { sendGmailMessage, textToHtml } from "@/lib/google/send-email";
import { upsertActivity } from "@/lib/crm/activities";
import { updateEngagementTag } from "@/lib/crm/engagement";
import { findOrCreateContact, addTagByName } from "@/lib/crm/find-or-create-contact";
import { syncContactToQuo } from "@/lib/quo/sync-contact";
import type { ParsedContactRow } from "@/lib/crm/bulk-import-contacts";

const QUO_BACKFILL_BATCH_SIZE = 25;

export async function sendTextToContact(contactId: string, toNumber: string, body: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  // Confirm this contact actually belongs to the signed-in user before
  // sending anything on their behalf (RLS would also block a mismatched
  // read/write, this just fails fast with a clear message).
  const { data: contact } = await supabase.from("contacts").select("id").eq("id", contactId).maybeSingle();
  if (!contact) return { ok: false as const, error: "Contact not found" };

  const result = await sendQuoText(toNumber, body);
  if (!result.ok) return { ok: false as const, error: result.error };

  const admin = createAdminClient();
  await upsertActivity(admin, user.id, contactId, "quo", "quo_message_id", result.quoMessageId, {
    type: "text",
    direction: "outbound",
    occurred_at: new Date().toISOString(),
    body,
    metadata: { quo_message_id: result.quoMessageId, sent_from_crm: true },
  });
  await updateEngagementTag(admin, user.id, contactId);

  return { ok: true as const };
}

export async function sendEmailToContact(contactId: string, toEmail: string, subject: string, body: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const { data: contact } = await supabase.from("contacts").select("id").eq("id", contactId).maybeSingle();
  if (!contact) return { ok: false as const, error: "Contact not found" };

  const admin = createAdminClient();
  const result = await sendGmailMessage(admin, user.id, toEmail, subject, textToHtml(body));
  if (!result.ok) return { ok: false as const, error: result.error };

  await upsertActivity(admin, user.id, contactId, "gmail", "gmail_message_id", result.messageId, {
    type: "email",
    direction: "outbound",
    occurred_at: new Date().toISOString(),
    body: `${subject}\n\n${body}`,
    metadata: { gmail_message_id: result.messageId, subject, sent_from_crm: true },
  });
  // Engagement is deliberately scoped to calls/texts only (see
  // lib/crm/engagement.ts) - email volume is a different pattern (e.g. a
  // sequence firing several at once shouldn't look like sudden engagement).

  return { ok: true as const };
}

export async function bulkImportContacts(rows: ParsedContactRow[], tagName: string | null, leadSource: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const admin = createAdminClient();
  let created = 0;
  let matched = 0;
  let failed = 0;

  // Sequential, not Promise.all - findOrCreateContact re-reads the full
  // contact list each call to check for a match, so running these
  // concurrently risks two rows for the same person both missing each
  // other and creating duplicates.
  for (const row of rows) {
    const result = await findOrCreateContact(admin, user.id, {
      email: row.email,
      phone: row.phone,
      firstName: row.firstName,
      lastName: row.lastName,
      leadSource,
      leadDate: row.leadDate,
      skipQuoSync: true,
    });
    if (!result) {
      failed++;
      continue;
    }
    if (result.wasCreated) created++;
    else matched++;
    if (tagName) await addTagByName(admin, user.id, result.id, tagName);
  }

  return { ok: true as const, created, matched, failed };
}

// Folds `mergeId` into `keepId` - calls, texts, deals, tasks, notes, tags,
// and sequence history all move over, then the duplicate row is deleted.
// See supabase/migrations/0021_merge_contacts.sql for exactly what moves.
export async function mergeContacts(keepId: string, mergeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const { error } = await supabase.rpc("merge_contacts", { keep_id: keepId, merge_id: mergeId, actor_id: user.id });
  if (error) return { ok: false as const, error: error.message };

  return { ok: true as const };
}

// Fired from ContactForm right after a manual save so Quo picks up the
// name/number without waiting for the next backfill run.
export async function syncContactToQuoAction(contactId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const admin = createAdminClient();
  const { data: contact } = await admin
    .from("contacts")
    .select("id, first_name, last_name, phone, email")
    .eq("id", contactId)
    .maybeSingle();
  if (contact) await syncContactToQuo(admin, contact);
}

// One click in Settings syncs a batch of never-synced contacts, so a big
// backlog doesn't risk timing out a single request. Returns how many are
// left so the button can say "click again" instead of silently stopping.
export async function backfillQuoSync() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const admin = createAdminClient();
  const { data: batch } = await admin
    .from("contacts")
    .select("id, first_name, last_name, phone, email")
    .eq("owner_id", user.id)
    .eq("archived", false)
    .is("quo_synced_at", null)
    .not("phone", "is", null)
    .limit(QUO_BACKFILL_BATCH_SIZE);

  let synced = 0;
  let failed = 0;
  for (const contact of batch ?? []) {
    const result = await syncContactToQuo(admin, contact);
    if (result.ok) synced++;
    else failed++;
  }

  const { count: remaining } = await admin
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id)
    .eq("archived", false)
    .is("quo_synced_at", null)
    .not("phone", "is", null);

  return { ok: true as const, synced, failed, remaining: remaining ?? 0 };
}
