import { createClient } from "@/lib/supabase/server";
import type { Contact } from "@/types/database";

// "Agent" is a tag, not a contact_type (0051) - a recruit can also
// genuinely be a vendor/buyer/whatever else, so entry into the funnel
// is a cross-cutting label rather than an exclusive category.
export async function listAgentRecruits(): Promise<Contact[]> {
  const supabase = await createClient();
  const { data: tag } = await supabase.from("tags").select("id").eq("name", "Agent").maybeSingle();
  if (!tag) return [];

  const { data } = await supabase.from("contact_tags").select("contacts(*)").eq("tag_id", tag.id);
  const recruits = (data ?? [])
    .map((row) => row.contacts as unknown as Contact)
    .filter((c): c is Contact => Boolean(c) && !c.archived);
  recruits.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return recruits;
}
