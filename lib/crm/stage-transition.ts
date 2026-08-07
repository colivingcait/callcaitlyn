import type { SupabaseClient } from "@supabase/supabase-js";
import type { PipelineStage } from "@/types/database";

export type DealModalMode = "under_contract" | "celebrate" | null;

// Central place to apply a contact's stage change so every entry point
// (manual selector, kanban card, AI-suggested apply) gets the same side
// effects: archiving on a move into Trash, capturing early deal details on
// a move into Under Contract, and finalizing/logging the permanent deals
// row on a move into a Win stage. A 'won' row is never touched again after
// being written, so a contact can cycle back to active and close again
// without losing the earlier conversion.
export async function applyStageChange(
  supabase: SupabaseClient,
  ownerId: string,
  contactId: string,
  oldStage: PipelineStage | undefined,
  newStage: PipelineStage | undefined,
) {
  const patch: Record<string, unknown> = { stage_id: newStage?.id ?? null };
  if (newStage?.is_trash) patch.archived = true;

  const { error } = await supabase.from("contacts").update(patch).eq("id", contactId);
  if (error) return { error, dealId: null, dealMode: null as DealModalMode };

  // dealId+dealMode are only set when the caller should pop the deal
  // details modal. The underlying row exists (and 'won' rows count toward
  // conversion rate) regardless of whether the agent fills in the modal or
  // skips it - the modal is purely for the extra detail.
  let dealId: string | null = null;
  let dealMode: DealModalMode = null;

  const enteringWon = newStage?.is_closed_won && !oldStage?.is_closed_won;
  const enteringUnderContract = newStage?.is_under_contract && !oldStage?.is_under_contract;
  const leavingUnderContractWithoutClosing = oldStage?.is_under_contract && !newStage?.is_under_contract && !enteringWon;

  if (enteringWon) {
    // Reuse a pending deal opened at Under Contract if one exists, so the
    // address/price/etc. already captured there survives instead of being
    // asked for twice - otherwise this is a fresh conversion.
    const { data: pending } = await supabase
      .from("deals")
      .select("id")
      .eq("contact_id", contactId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pending) {
      await supabase
        .from("deals")
        .update({ status: "won", stage_id: newStage!.id, closed_at: new Date().toISOString() })
        .eq("id", pending.id);
      dealId = pending.id;
    } else {
      const { data } = await supabase
        .from("deals")
        .insert({ owner_id: ownerId, contact_id: contactId, stage_id: newStage!.id, status: "won" })
        .select("id")
        .single();
      dealId = data?.id ?? null;
    }
    dealMode = "celebrate";
  } else if (enteringUnderContract) {
    const { data } = await supabase
      .from("deals")
      .insert({ owner_id: ownerId, contact_id: contactId, stage_id: newStage!.id, status: "pending" })
      .select("id")
      .single();
    dealId = data?.id ?? null;
    dealMode = "under_contract";
  } else if (leavingUnderContractWithoutClosing) {
    // Contract fell through before closing - the pending row was never a
    // real conversion, so it's deleted rather than left dangling.
    await supabase.from("deals").delete().eq("contact_id", contactId).eq("status", "pending");
  }

  return { error: null, dealId, dealMode };
}
