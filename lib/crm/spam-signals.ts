import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizePhone } from "@/lib/phone";

// Text-match spam detection for inbound Quo calls. Runs twice per call: once
// at call.completed (summary/transcript usually don't exist yet - a 12-second
// robocall has nothing to read), and again once call.transcript.completed /
// call.summary.completed actually deliver text. Reasons are fixed strings
// shown verbatim in the Spam bucket UI, so keep them stable once shipped.
const RULES: { reason: string; patterns: RegExp[] }[] = [
  { reason: "Google listing / verification", patterns: [/google listing/i, /google business/i, /business listing/i, /unverified/i, /verify your business/i] },
  { reason: "Business loans / funding", patterns: [/business loan/i, /working capital/i, /\bfunding\b/i, /merchant advance/i, /line of credit/i] },
  { reason: "Taxes / IRS", patterns: [/\birs\b/i, /tax relief/i, /back taxes/i, /tax settlement/i] },
  { reason: "Solar", patterns: [/\bsolar\b/i] },
  { reason: "Insurance / Medicare", patterns: [/medicare/i, /health plan/i, /final expense/i, /auto warranty insurance/i] },
  { reason: "SEO / web design", patterns: [/\bseo\b/i, /web design/i, /website redesign/i, /rank your site/i, /marketing services/i] },
  { reason: "Extended warranty", patterns: [/extended warranty/i, /vehicle warranty/i] },
  { reason: "Merchant services / card processing", patterns: [/merchant services/i, /card processing/i, /payment processing/i, /lower your rates/i] },
  { reason: "Staffing / recruiting pitches", patterns: [/\bstaffing\b/i, /recruiting services/i, /hire offshore/i, /virtual assistant agency/i] },
];

const MISSED_STATUSES = new Set(["missed", "no-answer", "no_answer", "busy", "voicemail"]);

const ROBOCALL_REASON = "Robocall, no voicemail";

// Settings → Spam filters lists exactly these ten, each independently
// toggleable (see spam_rule_overrides) - the regex-matched ones above plus
// the repeat-attempts rule, which has no pattern list of its own.
export const ALL_SPAM_RULE_REASONS: string[] = [...RULES.map((r) => r.reason), ROBOCALL_REASON];

export type SpamCheckInput = {
  summary: string | null;
  transcript: string | null;
  durationSeconds: number | null;
  status: string | null;
  hasVoicemail: boolean;
  // Set by the caller from a quick count of this contact's recent missed
  // inbound calls with no voicemail - detectSpam itself has no DB access,
  // so it can't compute this. Omit (or leave false) outside that check.
  repeatedInboundNoVoicemail?: boolean;
  // Rules she's turned off in Settings → Spam filters (by reason string) -
  // skipped entirely rather than matched-but-ignored, so a disabled rule
  // truly never flags anything.
  disabledReasons?: Set<string>;
};

export type SpamCheckResult = { isSpam: boolean; reason: string | null };

// Deliberately NOT included, per the owner: "unknown number, call under 15
// seconds" - short calls from real leads are common, and flagging on
// duration/unknown-number alone would bury genuine leads in the bucket.
export function detectSpam(input: SpamCheckInput): SpamCheckResult {
  const disabled = input.disabledReasons;
  const text = [input.summary, input.transcript].filter(Boolean).join("\n");
  for (const rule of RULES) {
    if (disabled?.has(rule.reason)) continue;
    if (rule.patterns.some((p) => p.test(text))) {
      return { isSpam: true, reason: rule.reason };
    }
  }

  const missed = input.status ? MISSED_STATUSES.has(input.status.toLowerCase()) : false;
  if (!disabled?.has(ROBOCALL_REASON) && missed && !input.hasVoicemail && input.repeatedInboundNoVoicemail) {
    return { isSpam: true, reason: ROBOCALL_REASON };
  }

  return { isSpam: false, reason: null };
}

export async function getDisabledSpamReasons(admin: SupabaseClient, ownerId: string): Promise<Set<string>> {
  const { data } = await admin.from("spam_rule_overrides").select("reason").eq("owner_id", ownerId).eq("enabled", false);
  return new Set((data ?? []).map((r) => r.reason as string));
}

export async function setSpamRuleEnabled(admin: SupabaseClient, ownerId: string, reason: string, enabled: boolean): Promise<void> {
  await admin.from("spam_rule_overrides").upsert({ owner_id: ownerId, reason, enabled }, { onConflict: "owner_id,reason" });
}

// What "Not spam" writes to (spam-actions.ts's markNotSpam) and what the
// webhook checks before ever running detectSpam - a number here is never
// re-flagged by any rule again, regardless of what a future call from it
// says.
export async function isNumberAllowlisted(admin: SupabaseClient, ownerId: string, phone: string | null): Promise<boolean> {
  const normalized = normalizePhone(phone);
  if (!normalized) return false;
  const { data } = await admin.from("spam_number_allowlist").select("id").eq("owner_id", ownerId).eq("phone", normalized).maybeSingle();
  return !!data;
}

export async function addToSpamAllowlist(admin: SupabaseClient, ownerId: string, phone: string | null): Promise<void> {
  const normalized = normalizePhone(phone);
  if (!normalized) return;
  await admin.from("spam_number_allowlist").upsert({ owner_id: ownerId, phone: normalized }, { onConflict: "owner_id,phone" });
}

const REPEAT_WINDOW_HOURS = 24;
const REPEAT_THRESHOLD = 3;

// The "robocall, no voicemail" rule's repeat-attempts signal - detectSpam
// itself has no DB access, so this runs as a separate query the caller
// folds into repeatedInboundNoVoicemail. Counts this contact's own missed
// inbound calls (not a cross-contact number search - the counterpart number
// on a bare auto-created contact is already unique to it) in the last 24h;
// 3+ with nothing answered or left as voicemail reads as a dialer, not a
// person trying to reach her.
export async function hasRepeatedMissedCalls(admin: SupabaseClient, ownerId: string, contactId: string): Promise<boolean> {
  const since = new Date(Date.now() - REPEAT_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("activities")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .eq("contact_id", contactId)
    .eq("type", "call")
    .eq("direction", "inbound")
    .gte("occurred_at", since);
  return (count ?? 0) >= REPEAT_THRESHOLD;
}
