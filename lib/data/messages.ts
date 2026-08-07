import { createClient } from "@/lib/supabase/server";
import type { Activity } from "@/types/database";

type ContactSummary = { id: string; first_name: string; last_name: string; phone: string | null };

export type Conversation = {
  contact: ContactSummary;
  lastActivity: Activity;
};

// Supabase's JS client can't easily express "latest row per group" in one
// query, and this dataset (one agent's calls/texts) is small enough that
// fetching a reasonably large recent window and grouping in JS is simpler
// and fast enough than a custom SQL view/RPC.
export async function listConversations(): Promise<Conversation[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activities")
    .select("*, contacts(id, first_name, last_name, phone)")
    .in("type", ["call", "text"])
    .order("occurred_at", { ascending: false })
    .limit(300);

  const seen = new Set<string>();
  const conversations: Conversation[] = [];

  for (const row of data ?? []) {
    const contact = row.contacts as unknown as ContactSummary | null;
    if (!contact || seen.has(contact.id)) continue;
    seen.add(contact.id);
    const { contacts: _contacts, ...activity } = row as Activity & { contacts: unknown };
    conversations.push({ contact, lastActivity: activity as Activity });
  }

  return conversations;
}

export async function getContactThread(contactId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activities")
    .select("*")
    .eq("contact_id", contactId)
    .in("type", ["call", "text"])
    .order("occurred_at", { ascending: true });
  return (data ?? []) as Activity[];
}
