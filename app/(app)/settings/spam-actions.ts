"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setSpamRuleEnabled } from "@/lib/crm/spam-signals";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function toggleSpamRule(reason: string, enabled: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  await setSpamRuleEnabled(supabase, user.id, reason, enabled);
  revalidatePath("/settings");
  return { ok: true };
}

// Removes a number from the allowlist - the rules above can flag it again
// on its next call, same as any number that was never marked "Not spam."
export async function removeSpamAllowlistEntry(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("spam_number_allowlist").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}
