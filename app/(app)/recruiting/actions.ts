"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AgentRecruitStage } from "@/types/database";

export type AgentRecruitInput = {
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  currentBrokerage: string | null;
  notes: string | null;
  referralFee: number | null;
};

export async function createAgentRecruit(input: AgentRecruitInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };
  if (!input.firstName.trim()) return { ok: false as const, error: "Name is required" };

  const { error } = await supabase.from("agent_recruits").insert({
    owner_id: user.id,
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    phone: input.phone,
    email: input.email,
    current_brokerage: input.currentBrokerage,
    notes: input.notes,
    referral_fee: input.referralFee,
  });

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/recruiting");
  return { ok: true as const };
}

export async function updateAgentRecruit(id: string, input: AgentRecruitInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };
  if (!input.firstName.trim()) return { ok: false as const, error: "Name is required" };

  const { error } = await supabase
    .from("agent_recruits")
    .update({
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      phone: input.phone,
      email: input.email,
      current_brokerage: input.currentBrokerage,
      notes: input.notes,
      referral_fee: input.referralFee,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/recruiting");
  return { ok: true as const };
}

// Same single-mutation-point idea as applyStageChange for the main
// Pipeline - here the only real "side effect" a stage change needs is
// stamping joined_at/fee_received_at the moment a recruit first reaches
// that stage, so the summary numbers on the page (agents joined this
// year, fees received) are dated by when it actually happened, not by
// whenever this row was last touched.
export async function changeRecruitStage(id: string, stage: AgentRecruitStage) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const { data: existing } = await supabase
    .from("agent_recruits")
    .select("joined_at, fee_received_at")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!existing) return { ok: false as const, error: "Recruit not found" };

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { stage, updated_at: now };
  if (stage === "joined" && !existing.joined_at) patch.joined_at = now;
  if (stage === "fee_received" && !existing.fee_received_at) patch.fee_received_at = now;

  const { error } = await supabase.from("agent_recruits").update(patch).eq("id", id).eq("owner_id", user.id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/recruiting");
  return { ok: true as const };
}

export async function deleteAgentRecruit(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const { error } = await supabase.from("agent_recruits").delete().eq("id", id).eq("owner_id", user.id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/recruiting");
  return { ok: true as const };
}
