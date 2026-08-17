import type { SupabaseClient } from "@supabase/supabase-js";
import { sendQuoText } from "@/lib/quo/send-message";
import { applyMergeFields } from "@/lib/crm/merge-fields";
import { upsertActivity } from "@/lib/crm/activities";
import { updateEngagementTag } from "@/lib/crm/engagement";

// Same spacing rationale as lib/crm/sequences.ts (see its comment) - a
// burst of near-identical texts from one number in a tight loop is exactly
// the kind of traffic that gets a business SMS number flagged by carriers,
// so this caps how many actually send per cron tick and puts real jittered
// delay between them rather than firing the whole recipient list at once.
const MAX_SENDS_PER_RUN = 8;
const MIN_SEND_SPACING_MS = 2500;
const SEND_SPACING_JITTER_MS = 1500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function spaceSends() {
  await sleep(MIN_SEND_SPACING_MS + Math.floor(Math.random() * SEND_SPACING_JITTER_MS));
}

type PendingRecipient = {
  id: string;
  contact_id: string;
  contacts: { id: string; first_name: string; last_name: string; phone: string | null } | null;
};

export async function processPendingTextBlasts(admin: SupabaseClient, ownerId: string) {
  const { data: blasts } = await admin
    .from("text_blasts")
    .select("id, message")
    .eq("owner_id", ownerId)
    .eq("status", "sending")
    .order("created_at", { ascending: true });

  let remaining = MAX_SENDS_PER_RUN;

  for (const blast of blasts ?? []) {
    if (remaining <= 0) break;

    const { data: pending } = await admin
      .from("text_blast_recipients")
      .select("id, contact_id, contacts(id, first_name, last_name, phone)")
      .eq("blast_id", blast.id)
      .eq("status", "pending")
      .limit(remaining);

    for (const recipient of (pending ?? []) as unknown as PendingRecipient[]) {
      const contact = recipient.contacts;

      if (!contact?.phone) {
        await admin.from("text_blast_recipients").update({ status: "skipped", error: "No phone number" }).eq("id", recipient.id);
        continue;
      }

      const body = applyMergeFields(blast.message, contact);
      const result = await sendQuoText(contact.phone, body);

      if (result.ok) {
        await admin.from("text_blast_recipients").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", recipient.id);
        await upsertActivity(admin, ownerId, contact.id, "quo", "quo_message_id", result.quoMessageId, {
          type: "text",
          direction: "outbound",
          occurred_at: new Date().toISOString(),
          body,
          metadata: { quo_message_id: result.quoMessageId, sent_from_crm: true, text_blast_id: blast.id },
        });
        await updateEngagementTag(admin, ownerId, contact.id);
      } else {
        await admin.from("text_blast_recipients").update({ status: "failed", error: result.error }).eq("id", recipient.id);
      }

      remaining--;
      if (remaining > 0) await spaceSends();
      if (remaining <= 0) break;
    }

    const { count: pendingCount } = await admin
      .from("text_blast_recipients")
      .select("id", { count: "exact", head: true })
      .eq("blast_id", blast.id)
      .eq("status", "pending");

    if ((pendingCount ?? 0) === 0) {
      await admin.from("text_blasts").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", blast.id);
    }
  }
}
