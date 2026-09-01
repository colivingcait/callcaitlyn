import { createClient } from "@/lib/supabase/server";
import { isConversationOwed } from "@/lib/crm/message-owed";
import type { Activity, ContactWithRelations } from "@/types/database";

type ContactSummary = Pick<
  ContactWithRelations,
  "id" | "first_name" | "last_name" | "phone" | "contact_type" | "timeline" | "representing" | "pipeline_stages" | "contact_tags" | "archived"
>;

export type Conversation = {
  contact: ContactSummary;
  lastActivity: Activity;
  owed: boolean;
};

// Supabase's JS client can't easily express "latest row per group" in one
// query, and this dataset (one agent's calls/texts) is small enough that
// fetching a reasonably large recent window and grouping in JS is simpler
// and fast enough than a custom SQL view/RPC.
//
// Hidden (archived) contacts - spam/trash leads - are excluded by default,
// reusing the same `archived` flag the rest of the app already treats as
// "soft trash." Pass hidden: true to see the hidden list instead.
//
// filter narrows which conversations come back: "owed" only the ones
// isConversationOwed flags, "calls" only call-type threads (missed or
// answered), "all"/undefined everything - all three still compute `owed`
// per row so the caller can style rows consistently either way.
export async function listConversations(opts?: { hidden?: boolean; filter?: "owed" | "all" | "calls" }): Promise<Conversation[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activities")
    .select(
      "*, contacts!inner(id, first_name, last_name, phone, contact_type, timeline, representing, archived, pipeline_stages(*), contact_tags(tags(*)))",
    )
    .eq("contacts.archived", !!opts?.hidden)
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
    const lastActivity = activity as Activity;

    if (opts?.filter === "calls" && lastActivity.type !== "call") continue;

    const owed = isConversationOwed(lastActivity);
    if (opts?.filter === "owed" && !owed) continue;

    conversations.push({ contact, lastActivity, owed });
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

export type TextableContact = { id: string; first_name: string; last_name: string; phone: string | null };

// For the "new message" contact picker - anyone without a phone number
// can't be texted, so there's no point surfacing them there.
export async function listTextableContacts(): Promise<TextableContact[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, phone")
    .eq("archived", false)
    .not("phone", "is", null)
    .order("first_name", { ascending: true });
  return (data ?? []) as TextableContact[];
}
