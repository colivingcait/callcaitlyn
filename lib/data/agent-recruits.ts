import { createClient } from "@/lib/supabase/server";
import type { Contact } from "@/types/database";

// Top of the recruiting funnel is simply every non-archived contact
// marked as an "agent" - no separate add step. recruit_stage null means
// still at that top stage ("Introduced").
export async function listAgentRecruits(): Promise<Contact[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contacts")
    .select("*")
    .eq("contact_type", "agent")
    .eq("archived", false)
    .order("created_at", { ascending: false });
  return (data ?? []) as Contact[];
}
