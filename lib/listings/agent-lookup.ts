import type { SupabaseClient } from "@supabase/supabase-js";
import { phonesMatch } from "@/lib/phone";

export type MatchedAgent = {
  listingAgentId: string | null;
  agentId: string | null;
  listingId: string | null;
  name: string;
  brokerage: string | null;
};

// Called before findOrCreateContact on every inbound Quo call/text. An
// agent recognized here never creates a contact, never gets an
// engagement tag, and never gets an AI read - see README part 2 §3,
// "Recognizing an agent who calls or texts." Checks the per-listing rows
// first (the specific "agent on 654 Gillette Ave" case), then falls back
// to the cross-listing directory (an agent known from a past listing but
// not this one).
export async function findAgentByPhone(admin: SupabaseClient, ownerId: string, phone: string): Promise<MatchedAgent | null> {
  const [{ data: listingAgents }, { data: agents }] = await Promise.all([
    admin.from("listing_agents").select("id, agent_id, listing_id, name, brokerage, phone").eq("owner_id", ownerId).not("phone", "is", null),
    admin.from("agents").select("id, name, brokerage, phone").eq("owner_id", ownerId).not("phone", "is", null),
  ]);

  const listingMatch = (listingAgents ?? []).find((a) => phonesMatch(a.phone, phone));
  if (listingMatch) {
    return {
      listingAgentId: listingMatch.id,
      agentId: listingMatch.agent_id,
      listingId: listingMatch.listing_id,
      name: listingMatch.name,
      brokerage: listingMatch.brokerage,
    };
  }

  const agentMatch = (agents ?? []).find((a) => phonesMatch(a.phone, phone));
  if (agentMatch) {
    return { listingAgentId: null, agentId: agentMatch.id, listingId: null, name: agentMatch.name, brokerage: agentMatch.brokerage };
  }

  return null;
}

// A read-only check, deliberately separate from findOrCreateContact -
// "an existing relationship wins" (README) means an agent who already has
// a contact record should get the normal contact-message treatment, not
// be redirected into listing_agent_messages just because they also
// happen to be on an RP list.
export async function contactExistsForPhone(admin: SupabaseClient, ownerId: string, phone: string): Promise<boolean> {
  const { data: candidates } = await admin
    .from("contacts")
    .select("id, phone, secondary_phone")
    .eq("owner_id", ownerId)
    .eq("archived", false);
  return (candidates ?? []).some((c) => phonesMatch(c.phone, phone) || phonesMatch(c.secondary_phone, phone));
}

export async function isAgentOptedOut(admin: SupabaseClient, ownerId: string, contact: { email?: string | null; phone?: string | null }): Promise<boolean> {
  const email = contact.email?.trim().toLowerCase() || null;
  const phone = contact.phone?.trim() || null;
  if (!email && !phone) return false;

  const { data } = await admin.from("agent_opt_outs").select("email, phone").eq("owner_id", ownerId);
  return (data ?? []).some((row) => (email && row.email?.toLowerCase() === email) || (phone && phonesMatch(row.phone, phone)));
}

// Held on a suppression list of just the contact details, not a profile -
// honored across every listing even though agent records themselves are
// per-listing (README: "An agent opt-out is honored across listings").
export async function recordAgentOptOut(admin: SupabaseClient, ownerId: string, contact: { email?: string | null; phone?: string | null }): Promise<void> {
  const email = contact.email?.trim().toLowerCase() || null;
  const phone = contact.phone?.trim() || null;
  if (!email && !phone) return;
  await admin.from("agent_opt_outs").insert({ owner_id: ownerId, email, phone });
}
