"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Manual entry always overwrites, unlike lib/crm/consent.ts's
// recordConsent (first-consent-wins, for the automatic sources) - she's
// deliberately recording this on purpose, so there's no "already set"
// guard to defer to. Also the one thing allowed to clear a prior opt-out:
// if she personally confirms renewed permission (a call, a conversation),
// that's the deliberate manual action the opt-out rule is waiting for.
export async function recordManualConsent(contactId: string, reason: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };
  if (!reason.trim()) return { ok: false as const, error: "Say how you got permission" };

  const admin = createAdminClient();
  await admin.from("contacts").update({ consent_source: reason.trim(), consent_at: new Date().toISOString(), opted_out_at: null }).eq("id", contactId);
  return { ok: true as const };
}

export async function markOptedOut(contactId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const admin = createAdminClient();
  await admin.from("contacts").update({ opted_out_at: new Date().toISOString() }).eq("id", contactId);
  return { ok: true as const };
}

// Deliberately manual only - the one place this app is strict rather than
// suggestive. Nothing automatic ever clears an opt-out.
export async function clearOptOut(contactId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const admin = createAdminClient();
  await admin.from("contacts").update({ opted_out_at: null }).eq("id", contactId);
  return { ok: true as const };
}
