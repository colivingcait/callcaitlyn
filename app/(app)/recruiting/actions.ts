"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { RecruitStage } from "@/types/database";

// The only mutation this feature needs now - creating/editing an agent
// contact goes through the real contact form (contact_type: "agent"),
// not a bespoke path. Stamps recruit_joined_at/recruit_fee_received_at
// the first time a contact reaches that stage, so the totals on the
// recruiting page are dated by when it actually happened.
export async function changeRecruitStage(contactId: string, stage: RecruitStage | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const { data: existing } = await supabase
    .from("contacts")
    .select("recruit_joined_at, recruit_fee_received_at")
    .eq("id", contactId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!existing) return { ok: false as const, error: "Contact not found" };

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { recruit_stage: stage };
  if (stage === "joined" && !existing.recruit_joined_at) patch.recruit_joined_at = now;
  if (stage === "fee_received" && !existing.recruit_fee_received_at) patch.recruit_fee_received_at = now;

  const { error } = await supabase.from("contacts").update(patch).eq("id", contactId).eq("owner_id", user.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/recruiting");
  revalidatePath(`/contacts/${contactId}`);
  return { ok: true as const };
}
