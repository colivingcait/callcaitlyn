import { createClient } from "@/lib/supabase/server";
import { conversationOwedFromHistory } from "@/lib/crm/message-owed";
import { isSpamLikeMissedCall } from "@/lib/crm/today-eligible";
import { listAllowlistedPhoneKeys } from "@/lib/crm/spam-signals";
import type { Activity, ContactWithRelations } from "@/types/database";

type ContactSummary = Pick<
  ContactWithRelations,
  "id" | "first_name" | "last_name" | "phone" | "contact_type" | "timeline" | "representing" | "pipeline_stages" | "contact_tags" | "archived" | "spam"
>;

export type Conversation = {
  contact: ContactSummary;
  lastActivity: Activity;
  owed: boolean;
  owedActivity: Activity | null;
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
// Spam-flagged contacts (contacts.spam - see migration 0066) are a second,
// orthogonal exclusion: kept, not archived, so they stay recoverable and
// visible in their own bucket, but they must never appear in the normal
// inbox, its badge count, or Today's replies-owed group. Pass spam: true to
// see the bucket instead. Hidden already covers "archived for any reason"
// (including a spam call that was explicitly deleted from the bucket), so
// the spam filter only applies when hidden is NOT requested.
//
// filter narrows which conversations come back: "owed" only the ones
// isConversationOwed flags, "calls" only call-type threads (missed or
// answered), "all"/undefined everything - all three still compute `owed`
// per row so the caller can style rows consistently either way.
export async function listConversations(opts?: { hidden?: boolean; spam?: boolean; filter?: "owed" | "all" | "calls" }): Promise<Conversation[]> {
  const supabase = await createClient();
  let query = supabase
    .from("activities")
    .select(
      "*, contacts!inner(id, first_name, last_name, phone, contact_type, timeline, representing, archived, spam, pipeline_stages(*), contact_tags(tags(*)))",
    )
    .eq("contacts.archived", !!opts?.hidden)
    .in("type", ["call", "text"])
    .order("occurred_at", { ascending: false })
    .limit(300);

  if (!opts?.hidden) query = query.eq("contacts.spam", !!opts?.spam);

  const { data } = await query;

  const byContact = new Map<string, { contact: ContactSummary; activities: Activity[] }>();
  function ingest(rows: typeof data) {
    for (const row of rows ?? []) {
      const contact = row.contacts as unknown as ContactSummary | null;
      if (!contact) continue;
      const { contacts: _contacts, ...activity } = row as Activity & { contacts: unknown };
      const entry = byContact.get(contact.id);
      if (entry) {
        entry.activities.push(activity as Activity);
      } else {
        byContact.set(contact.id, { contact, activities: [activity as Activity] });
      }
    }
  }
  ingest(data);

  const allowlisted = await listAllowlistedPhoneKeys(supabase);

  // Realtor robocalls usually auto-create a contact named after the phone
  // and never get contacts.spam=true (no transcript yet / rotating CID).
  // Those belong in the spam bucket with flagged spam, not the inbox.
  if (opts?.spam) {
    const { data: stubs } = await supabase
      .from("activities")
      .select(
        "*, contacts!inner(id, first_name, last_name, phone, contact_type, timeline, representing, archived, spam, pipeline_stages(*), contact_tags(tags(*)))",
      )
      .eq("contacts.archived", false)
      .eq("contacts.spam", false)
      .in("type", ["call", "text"])
      .order("occurred_at", { ascending: false })
      .limit(300);
    ingest(stubs);
  }

  const conversations: Conversation[] = [];
  for (const { contact, activities } of byContact.values()) {
    const lastActivity = activities[0];
    if (opts?.filter === "calls" && lastActivity.type !== "call") continue;
    const { owed, activity } = conversationOwedFromHistory(activities);
    const spamLike = !!(activity && isSpamLikeMissedCall(contact, activity, allowlisted));
    if (opts?.spam) {
      if (!contact.spam && !spamLike) continue;
    } else if (!opts?.hidden && spamLike) {
      continue;
    }
    const showOwed = opts?.spam || opts?.hidden ? owed : owed && !spamLike;
    if (opts?.filter === "owed" && !showOwed) continue;
    conversations.push({
      contact,
      lastActivity,
      owed: showOwed,
      owedActivity: showOwed ? activity : null,
    });
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
