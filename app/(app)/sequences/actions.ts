"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendGmailMessage, textToHtml } from "@/lib/google/send-email";
import { applyMergeFields } from "@/lib/crm/sequences";
import { resolveEmailAudience, type EmailAudienceCriteria } from "@/lib/crm/email-audience";
import { fullName } from "@/lib/utils";

// Clearly-fake sample data, not her real contacts - a test send previews
// merge-field placement and tone, not a real personalization.
const PREVIEW_CONTACT = { first_name: "Jamie", last_name: "Example" };

export async function sendTestStepEmail(stepId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const { data: step } = await supabase.from("email_sequence_steps").select("subject, body").eq("id", stepId).maybeSingle();
  if (!step) return { ok: false as const, error: "Step not found" };

  const { data: account } = await supabase.from("gmail_accounts").select("email_address").eq("owner_id", user.id).maybeSingle();
  if (!account) return { ok: false as const, error: "Connect Gmail in Settings first" };

  const admin = createAdminClient();
  const subject = `[Test] ${applyMergeFields(step.subject, PREVIEW_CONTACT)}`;
  const html = textToHtml(applyMergeFields(step.body, PREVIEW_CONTACT));
  const result = await sendGmailMessage(admin, user.id, account.email_address, subject, html);
  if (!result.ok) return { ok: false as const, error: result.error };
  return { ok: true as const };
}

// Same test-send as sendTestStepEmail, but for a step that hasn't been
// saved yet - the new-step form's draft subject/body, passed straight
// through rather than read back from a saved row. Lets her check a real
// inbox render (formatting, links) before adding the step at all, not
// just after.
export async function sendTestEmailDraft(subject: string, body: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const { data: account } = await supabase.from("gmail_accounts").select("email_address").eq("owner_id", user.id).maybeSingle();
  if (!account) return { ok: false as const, error: "Connect Gmail in Settings first" };

  const admin = createAdminClient();
  const testSubject = `[Test] ${applyMergeFields(subject, PREVIEW_CONTACT)}`;
  const html = textToHtml(applyMergeFields(body, PREVIEW_CONTACT));
  const result = await sendGmailMessage(admin, user.id, account.email_address, testSubject, html);
  if (!result.ok) return { ok: false as const, error: result.error };
  return { ok: true as const };
}

export type AudiencePreview = {
  count: number;
  names: string[]; // capped - see below
  excludedCount: number;
  optedOutCount: number;
  noEmailCount: number;
};

const AUDIENCE_PREVIEW_NAME_CAP = 30;

// Backs the live "who's this going to" panel in CreateSequenceForm and
// SequenceSettingsPanel - same resolveEmailAudience the actual send uses
// (lib/crm/sequences.ts's processBroadcastSequence), so what she sees
// here is exactly who gets it, not a separate approximation that could
// drift. Names are capped for a reasonable payload size; count is exact.
export async function previewEmailAudience(criteria: EmailAudienceCriteria): Promise<AudiencePreview> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { count: 0, names: [], excludedCount: 0, optedOutCount: 0, noEmailCount: 0 };

  const admin = createAdminClient();
  const result = await resolveEmailAudience(admin, user.id, criteria);
  return {
    count: result.eligible.length,
    names: result.eligible.slice(0, AUDIENCE_PREVIEW_NAME_CAP).map((c) => fullName(c)),
    excludedCount: result.excludedCount,
    optedOutCount: result.optedOutCount,
    noEmailCount: result.noEmailCount,
  };
}

export async function duplicateSequence(sequenceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const { data: original } = await supabase.from("email_sequences").select("*").eq("id", sequenceId).maybeSingle();
  if (!original) return { ok: false as const, error: "Sequence not found" };

  const { data: steps } = await supabase
    .from("email_sequence_steps")
    .select("*")
    .eq("sequence_id", sequenceId)
    .order("step_order", { ascending: true });

  const { data: copy, error: insertError } = await supabase
    .from("email_sequences")
    .insert({
      owner_id: user.id,
      name: `${original.name} (copy)`,
      type: original.type,
      target_tag_ids: original.target_tag_ids,
      exclude_tag_ids: original.exclude_tag_ids,
      exclude_stage_ids: original.exclude_stage_ids,
      exclude_timelines: original.exclude_timelines,
      description: original.description,
      active: false,
    })
    .select("id")
    .single();
  if (insertError || !copy) return { ok: false as const, error: insertError?.message ?? "Couldn't duplicate" };

  if (steps && steps.length > 0) {
    const { error: stepsError } = await supabase.from("email_sequence_steps").insert(
      steps.map((s) => ({
        sequence_id: copy.id,
        step_order: s.step_order,
        subject: s.subject,
        body: s.body,
        // Broadcast/batch dates are absolute, specific to the original run -
        // copying verbatim would silently schedule the clone in the past.
        // Drip delays are relative, so they carry over fine.
        send_at: original.type === "drip" ? s.send_at : null,
        delay_amount: s.delay_amount,
        delay_unit: s.delay_unit,
        active: s.active,
      })),
    );
    if (stepsError) return { ok: false as const, error: stepsError.message };
  }

  return { ok: true as const, id: copy.id as string };
}
