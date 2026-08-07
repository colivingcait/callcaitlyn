import { createClient } from "@/lib/supabase/server";
import type { Deal } from "@/types/database";

export type DealWithContact = Deal & {
  contacts: { id: string; first_name: string; last_name: string; lead_source: string | null } | null;
};

export async function listWonDeals(): Promise<DealWithContact[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("deals")
    .select("*, contacts(id, first_name, last_name, lead_source)")
    .eq("status", "won")
    .order("closed_at", { ascending: true });
  return (data ?? []) as DealWithContact[];
}

// Under-contract deals aren't real income yet, but they still need to run
// through the same KW/KWRI cap walk as won deals - otherwise a pending
// deal has no way to show what it'll actually owe once it closes, which
// depends on how much cap room prior deals in the same commission year
// already used.
export async function listPendingDeals(): Promise<DealWithContact[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("deals")
    .select("*, contacts(id, first_name, last_name, lead_source)")
    .eq("status", "pending")
    .order("closed_at", { ascending: true });
  return (data ?? []) as DealWithContact[];
}
