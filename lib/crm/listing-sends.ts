import type { SupabaseClient } from "@supabase/supabase-js";
import { sendQuoText } from "@/lib/quo/send-message";
import { sendGmailMessage } from "@/lib/google/send-email";
import { draftToHtml } from "@/lib/crm/merge-fields";
import { isWithinQuietHours } from "@/lib/crm/text-blast-timing";
import { listingTextPhoneKey } from "@/lib/crm/listing-text-dedupe";
import { normalizeAgentEmail } from "@/lib/crm/agent-identity";

// Agent sends deliberately don't reuse text_blasts/email_sequences end to
// end - those two resolve recipients from `contacts` (merge fields,
// engagement tagging, per-contact unsubscribe), while an agent send
// resolves straight from listing_agents rows and must never touch a
// contact or show up in Campaigns. This mirrors their shape (see
// migration 0069 / 0031) closely enough that the composer UI can reuse
// the same preview/test/confirm patterns without sharing the send path.

const SENDS_PER_RUN = 8;
const MIN_SEND_SPACING_MS = 2000;
const SEND_SPACING_JITTER_MS = 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// "{{agent_first_name}}" is the one merge token these sends support - an
// agent record has no first/last split the way a contact does.
export function agentFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

export function applyAgentMergeFields(text: string, agent: { name: string }): string {
  return text.replace(/\{\{\s*agent_first_name\s*\}\}/gi, agentFirstName(agent.name));
}

type PendingRecipient = {
  id: string;
  listing_agent_id: string;
  listing_agents: { id: string; name: string; email: string | null; phone: string | null; count_sent: number | null } | null;
};

export async function processPendingListingSends(admin: SupabaseClient, ownerId: string): Promise<void> {
  const { data: sends } = await admin
    .from("listing_sends")
    .select("id, listing_id, channel, subject, message, send_immediately")
    .eq("owner_id", ownerId)
    .eq("status", "sending")
    .order("created_at", { ascending: true });

  const quietHours = isWithinQuietHours();
  let remaining = SENDS_PER_RUN;

  for (const send of sends ?? []) {
    if (remaining <= 0) break;
    // Quiet hours only apply to texts (see the composer's own quiet-hours
    // copy) - an early-morning email has no carrier-flagging risk.
    if (send.channel === "text" && quietHours && !send.send_immediately) continue;

    const { data: pending } = await admin
      .from("listing_send_recipients")
      .select("id, listing_agent_id, listing_agents(id, name, email, phone, count_sent)")
      .eq("send_id", send.id)
      .eq("status", "pending")
      .limit(remaining);

    const sentPhones = new Set<string>();
    const sentEmails = new Set<string>();
    if (send.channel === "text") {
      const { data: alreadySent } = await admin
        .from("listing_send_recipients")
        .select("listing_agents(phone)")
        .eq("send_id", send.id)
        .eq("status", "sent");
      for (const row of alreadySent ?? []) {
        const joined = row.listing_agents as { phone: string | null } | { phone: string | null }[] | null;
        const phone = Array.isArray(joined) ? joined[0]?.phone : joined?.phone;
        const key = listingTextPhoneKey(phone);
        if (key) sentPhones.add(key);
      }
    } else {
      const { data: alreadySent } = await admin
        .from("listing_send_recipients")
        .select("listing_agents(email)")
        .eq("send_id", send.id)
        .eq("status", "sent");
      for (const row of alreadySent ?? []) {
        const joined = row.listing_agents as { email: string | null } | { email: string | null }[] | null;
        const email = Array.isArray(joined) ? joined[0]?.email : joined?.email;
        const key = normalizeAgentEmail(email);
        if (key) sentEmails.add(key);
      }
    }

    for (const recipient of (pending ?? []) as unknown as PendingRecipient[]) {
      const agent = recipient.listing_agents;
      if (!agent) {
        await admin.from("listing_send_recipients").update({ status: "skipped", error: "Agent record missing" }).eq("id", recipient.id);
        continue;
      }

      const body = applyAgentMergeFields(send.message, agent);
      let result: { ok: boolean; error?: string };

      if (send.channel === "text") {
        if (!agent.phone) {
          await admin.from("listing_send_recipients").update({ status: "skipped", error: "No phone number" }).eq("id", recipient.id);
          continue;
        }
        const phoneKey = listingTextPhoneKey(agent.phone);
        if (phoneKey && sentPhones.has(phoneKey)) {
          await admin.from("listing_send_recipients").update({ status: "skipped", error: "Duplicate phone" }).eq("id", recipient.id);
          continue;
        }
        const sendResult = await sendQuoText(agent.phone, body);
        result = sendResult.ok ? { ok: true } : { ok: false, error: sendResult.error };
        if (result.ok && phoneKey) sentPhones.add(phoneKey);
      } else {
        if (!agent.email) {
          await admin.from("listing_send_recipients").update({ status: "skipped", error: "No email on file" }).eq("id", recipient.id);
          continue;
        }
        const emailKey = normalizeAgentEmail(agent.email);
        if (emailKey && sentEmails.has(emailKey)) {
          await admin.from("listing_send_recipients").update({ status: "skipped", error: "Duplicate email" }).eq("id", recipient.id);
          continue;
        }
        const sendResult = await sendGmailMessage(admin, ownerId, agent.email, send.subject || "New listing", draftToHtml(body));
        result = sendResult.ok ? { ok: true } : { ok: false, error: sendResult.error };
        if (result.ok && emailKey) sentEmails.add(emailKey);
      }

      if (result.ok) {
        await admin.from("listing_send_recipients").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", recipient.id);
        await admin
          .from("listing_agents")
          .update({
            state: send.channel === "text" ? "texted" : "emailed",
            count_sent: (agent.count_sent ?? 0) + 1,
            date_sent: new Date().toISOString().slice(0, 10),
          })
          .eq("id", agent.id);
      } else {
        await admin.from("listing_send_recipients").update({ status: "failed", error: result.error ?? "Send failed" }).eq("id", recipient.id);
      }

      remaining--;
      if (remaining > 0) await sleep(MIN_SEND_SPACING_MS + Math.floor(Math.random() * SEND_SPACING_JITTER_MS));
      if (remaining <= 0) break;
    }

    const { count: pendingCount } = await admin
      .from("listing_send_recipients")
      .select("id", { count: "exact", head: true })
      .eq("send_id", send.id)
      .eq("status", "pending");

    if ((pendingCount ?? 0) === 0) {
      await admin.from("listing_sends").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", send.id);
    }
  }
}
