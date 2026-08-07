import type { SupabaseClient } from "@supabase/supabase-js";
import { sendGmailMessage, textToHtml } from "@/lib/google/send-email";
import { upsertActivity } from "@/lib/crm/activities";
import type { EmailSequence, EmailSequenceStep } from "@/types/database";

type SequenceContact = {
  id: string;
  email: string | null;
  first_name: string;
  last_name: string;
  archived: boolean;
  unsubscribe_token: string;
};

function baseUrl() {
  return (process.env.APP_BASE_URL ?? "https://www.callcaitlyn.com").replace(/\/$/, "");
}

export function applyMergeFields(text: string, contact: { first_name: string; last_name: string }) {
  return text
    .replace(/\{\{\s*first_name\s*\}\}/gi, contact.first_name || "")
    .replace(/\{\{\s*last_name\s*\}\}/gi, contact.last_name || "");
}

// Rewrites every link to route through the click-tracking redirect, and
// appends an invisible open-tracking pixel plus an unsubscribe footer -
// all keyed to this specific send, so opens/clicks/unsubscribes can be
// attributed to a particular step rather than the sequence as a whole.
function instrumentEmail(html: string, sendId: string, contact: SequenceContact) {
  const url = baseUrl();
  const withTrackedLinks = html.replace(/href="(https?:\/\/[^"]+)"/g, (_match, target) => {
    return `href="${url}/api/track/click/${sendId}?url=${encodeURIComponent(target)}"`;
  });
  const pixel = `<img src="${url}/api/track/open/${sendId}" width="1" height="1" alt="" style="display:none" />`;
  const unsubscribe = `<p style="margin-top:24px;font-size:11px;color:#94a3b8;">
    <a href="${url}/api/unsubscribe/${contact.unsubscribe_token}?send=${sendId}" style="color:#94a3b8;">Unsubscribe from this list</a>
  </p>`;
  return `${withTrackedLinks}${pixel}${unsubscribe}`;
}

export function stepDelayMs(step: EmailSequenceStep) {
  const amount = step.delay_amount ?? 0;
  const unitMs = step.delay_unit === "hours" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  return amount * unitMs;
}

// The moment a drip enrollment's *current* step becomes due - cumulative
// delay from every step up to and including it, relative to enrolled_at.
// Shared between the sender (below) and the read-side "next send" display
// so they can never drift apart.
export function computeDripDueAt(steps: EmailSequenceStep[], enrollment: { enrolled_at: string; current_step: number }): Date | null {
  if (enrollment.current_step >= steps.length) return null;
  let cumulativeMs = 0;
  for (let i = 0; i <= enrollment.current_step; i++) cumulativeMs += stepDelayMs(steps[i]);
  return new Date(new Date(enrollment.enrolled_at).getTime() + cumulativeMs);
}

// Shared by both broadcast and drip: claim the send (insert first, so a
// concurrent/overlapping cron run can't double-send the same step to the
// same contact), then actually send. If sending fails, release the claim
// so the next run retries instead of silently losing that email forever.
async function sendStepToContact(
  admin: SupabaseClient,
  ownerId: string,
  sequence: EmailSequence,
  step: EmailSequenceStep,
  contact: SequenceContact,
): Promise<string | null> {
  if (!contact.email || contact.archived) return null;

  const { data: excluded } = await admin
    .from("email_sequence_exclusions")
    .select("id")
    .eq("sequence_id", sequence.id)
    .eq("contact_id", contact.id)
    .maybeSingle();
  if (excluded) return null;

  const { data: claimed, error: claimError } = await admin
    .from("email_sequence_sends")
    .insert({ sequence_id: sequence.id, step_id: step.id, contact_id: contact.id })
    .select("id")
    .single();
  if (claimError || !claimed) return null; // already sent (unique violation) or a genuine failure

  const subject = applyMergeFields(step.subject, contact);
  const html = instrumentEmail(textToHtml(applyMergeFields(step.body, contact)), claimed.id, contact);
  const unsubscribeUrl = `${baseUrl()}/api/unsubscribe/${contact.unsubscribe_token}?send=${claimed.id}`;

  const result = await sendGmailMessage(admin, ownerId, contact.email, subject, html, {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  });
  if (!result.ok) {
    await admin.from("email_sequence_sends").delete().eq("id", claimed.id);
    console.error(`Sequence send failed for ${sequence.id}/${step.id}/${contact.id}:`, result.error);
    return null;
  }

  await upsertActivity(admin, ownerId, contact.id, "gmail", "gmail_message_id", result.messageId, {
    type: "email",
    direction: "outbound",
    occurred_at: new Date().toISOString(),
    body: `${subject}\n\n(from sequence: ${sequence.name})`,
    metadata: { gmail_message_id: result.messageId, subject, sequence_id: sequence.id, step_id: step.id },
  });

  return claimed.id;
}

async function processBroadcastSequence(admin: SupabaseClient, ownerId: string, sequence: EmailSequence) {
  if (!sequence.target_tag_id) return;
  const { data: steps } = await admin
    .from("email_sequence_steps")
    .select("*")
    .eq("sequence_id", sequence.id)
    .order("step_order", { ascending: true });

  const dueSteps = (steps ?? []).filter((s) => s.active && s.send_at && new Date(s.send_at) <= new Date());
  if (dueSteps.length === 0) return;

  const { data: members } = await admin
    .from("contact_tags")
    .select("contacts(id, email, first_name, last_name, archived, unsubscribe_token)")
    .eq("tag_id", sequence.target_tag_id);

  const contacts = (members ?? [])
    .map((m) => m.contacts as unknown as SequenceContact | null)
    .filter((c): c is SequenceContact => !!c && !c.archived);

  for (const step of dueSteps) {
    for (const contact of contacts) {
      await sendStepToContact(admin, ownerId, sequence, step, contact);
    }
  }
}

async function processDripSequence(admin: SupabaseClient, ownerId: string, sequence: EmailSequence) {
  const { data: steps } = await admin
    .from("email_sequence_steps")
    .select("*")
    .eq("sequence_id", sequence.id)
    .order("step_order", { ascending: true });
  if (!steps || steps.length === 0) return;

  const { data: enrollments } = await admin
    .from("email_sequence_enrollments")
    .select("*, contacts(id, email, first_name, last_name, archived, unsubscribe_token)")
    .eq("sequence_id", sequence.id)
    .eq("status", "active");

  for (const enrollment of enrollments ?? []) {
    const contact = enrollment.contacts as unknown as SequenceContact | null;
    if (!contact || contact.archived) continue;

    if (enrollment.current_step >= steps.length) {
      await admin.from("email_sequence_enrollments").update({ status: "completed" }).eq("id", enrollment.id);
      continue;
    }

    const step = steps[enrollment.current_step];
    if (!step.active) continue; // held - stays parked at this step until resumed

    const dueAt = computeDripDueAt(steps, enrollment);
    if (!dueAt || dueAt.getTime() > Date.now()) continue;

    const sendId = await sendStepToContact(admin, ownerId, sequence, step, contact);
    if (sendId) {
      const isLastStep = enrollment.current_step + 1 >= steps.length;
      await admin
        .from("email_sequence_enrollments")
        .update({ current_step: enrollment.current_step + 1, status: isLastStep ? "completed" : "active" })
        .eq("id", enrollment.id);
    }
  }
}

export async function processDueSequences(admin: SupabaseClient, ownerId: string) {
  const { data: sequences } = await admin.from("email_sequences").select("*").eq("owner_id", ownerId).eq("active", true);
  for (const sequence of (sequences ?? []) as EmailSequence[]) {
    if (sequence.type === "broadcast") await processBroadcastSequence(admin, ownerId, sequence);
    else await processDripSequence(admin, ownerId, sequence);
  }
}
