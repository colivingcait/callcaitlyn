import { createClient } from "@/lib/supabase/server";
import type { Deal } from "@/types/database";

export type DealWithContact = Deal & {
  contacts: { id: string; first_name: string; last_name: string; lead_source: string | null } | null;
};

// Won deals only - pending (under-contract) deals don't have real closing
// numbers yet and would just be noise in a financial report.
export async function listWonDeals(): Promise<DealWithContact[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("deals")
    .select("*, contacts(id, first_name, last_name, lead_source)")
    .eq("status", "won")
    .order("closed_at", { ascending: true });
  return (data ?? []) as DealWithContact[];
}
