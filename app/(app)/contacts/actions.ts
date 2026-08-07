"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendQuoText } from "@/lib/quo/send-message";
import { sendGmailMessage, textToHtml } from "@/lib/google/send-email";
import { upsertActivity } from "@/lib/crm/activities";
import { updateEngagementTag } from "@/lib/crm/engagement";

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
