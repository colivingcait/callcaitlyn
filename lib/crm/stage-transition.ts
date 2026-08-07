import type { SupabaseClient } from "@supabase/supabase-js";
import type { PipelineStage } from "@/types/database";

// Central place to apply a contact's stage change so every entry point
// (manual selector, kanban card, AI-suggested apply) gets the same
// side effects: archiving on a move into Trash, and logging a permanent
// deals row the first time a contact enters a Won stage. Deals are never
// touched again after being written, so a contact can cycle back to
// active and close again without losing the earlier conversion.
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
  if (error) return { error, dealId: null };

  // dealId is only set when a brand-new deal was just written - the caller
  // uses it to decide whether to pop the deal-closing celebration/details
  // modal. The row exists (and counts toward conversion rate) regardless
  // of whether the agent goes on to fill in the extra details or not.
  let dealId: string | null = null;
  const enteringWon = newStage?.is_closed_won && !oldStage?.is_closed_won;
  if (enteringWon) {
    const { data } = await supabase
      .from("deals")
      .insert({ owner_id: ownerId, contact_id: contactId, stage_id: newStage!.id })
      .select("id")
      .single();
    dealId = data?.id ?? null;
  }

  return { error: null, dealId };
}
