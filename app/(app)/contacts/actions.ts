"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendQuoText } from "@/lib/quo/send-message";
import { upsertActivity } from "@/lib/crm/activities";

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

  return { ok: true as const };
}
