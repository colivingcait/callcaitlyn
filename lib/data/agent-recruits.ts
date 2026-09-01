import { createClient } from "@/lib/supabase/server";
import type { AgentRecruit } from "@/types/database";

export async function listAgentRecruits(): Promise<AgentRecruit[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("agent_recruits").select("*").order("created_at", { ascending: false });
  return (data ?? []) as AgentRecruit[];
}
