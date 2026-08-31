import type { SupabaseClient } from "@supabase/supabase-js";

// First-consent-wins - the earliest real reason she had permission is the
// one worth keeping on the record, not whatever happened to touch the
// contact most recently. Deliberately never touches opted_out_at: once
// someone's opted out, a later registration/check-in/inbound message
// doesn't silently re-enable them - that's a manual, deliberate action
// only (see recordOptOut's caller and the settings UI), matching the
// design brief's "this is the one place the system should be strict
// rather than suggestive."
export async function recordConsent(admin: SupabaseClient, contactId: string, source: string): Promise<void> {
  await admin
    .from("contacts")
    .update({ consent_source: source, consent_at: new Date().toISOString() })
    .eq("id", contactId)
    .is("consent_at", null);
}

export async function recordOptOut(admin: SupabaseClient, contactId: string): Promise<void> {
  await admin.from("contacts").update({ opted_out_at: new Date().toISOString() }).eq("id", contactId);
}

// CTIA-standard opt-out keywords, matched as the ENTIRE message body
// (trimmed, case-insensitive) - not a substring check, so "she stopped by
// today" in a note or a real text never gets mistaken for an opt-out.
const STOP_KEYWORDS = new Set(["stop", "stopall", "unsubscribe", "cancel", "end", "quit"]);

export function isOptOutMessage(text: string): boolean {
  return STOP_KEYWORDS.has(text.trim().toLowerCase());
}
