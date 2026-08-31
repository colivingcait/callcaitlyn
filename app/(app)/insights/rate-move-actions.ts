"use server";

import { createClient } from "@/lib/supabase/server";
import { writeDismissal } from "@/lib/crm/dismissed-insights";
import { sendTextToContact, sendEmailToContact } from "@/app/(app)/contacts/actions";

export async function sendRateMoveMessage(contactId: string, channel: "text" | "email", to: string, message: string) {
  if (channel === "text") return sendTextToContact(contactId, to, message);
  return sendEmailToContact(contactId, to, "Rates came down - worth another look?", message);
}

// Same 30-day dismissed_insights window every other Insights card uses -
// "Not him" hides this one contact's row, not the whole card.
export async function dismissRateMove(contactId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  await writeDismissal(supabase, user.id, "rate_move", contactId);
  return { ok: true as const };
}
