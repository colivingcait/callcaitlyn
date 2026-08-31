import { createClient } from "@/lib/supabase/server";
import type { Quote } from "@/types/database";

export async function getQuoteById(quoteId: string): Promise<Quote | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("quotes").select("*").eq("id", quoteId).maybeSingle();
  return (data as Quote) ?? null;
}
