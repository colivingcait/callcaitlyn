import { createClient } from "@/lib/supabase/server";
import { clusterAgentsByIdentity, collapseListingAgents, dedupeAgentsByIdentity, normalizeAgentEmail } from "@/lib/crm/agent-identity";
import { classifyListingPageActivity } from "@/lib/crm/listing-activity";
import type { ListingPageLeadEvent } from "@/lib/crm/listing-activity";
import type { Listing, ListingAgent, ListingPriceChange, ListingSend, ListingDocument, Agent, ListingStatus, ListingStatusChange } from "@/types/database";

export type ListingWithSummary = Listing & {
  agentCount: number;
  emailedCount: number;
  repliedCount: number;
  noEmailCount: number;
};

export type ListingsIndexData = {
  listings: ListingWithSummary[];
  counts: Record<ListingStatus, number>;
};

export async function getListingsIndex(): Promise<ListingsIndexData> {
  const supabase = await createClient();
  const [{ data: listings }, { data: agents }] = await Promise.all([
    supabase.from("listings").select("*").order("created_at", { ascending: false }),
    supabase.from("listing_agents").select("listing_id, name, state, email, phone"),
  ]);

  const agentsByListing = new Map<string, { name: string; state: ListingAgent["state"]; email: string | null; phone: string | null }[]>();
  for (const a of agents ?? []) {
    if (!agentsByListing.has(a.listing_id)) agentsByListing.set(a.listing_id, []);
    agentsByListing.get(a.listing_id)!.push(a);
  }

  const withSummary: ListingWithSummary[] = (listings ?? []).map((l) => {
    const rows = collapseListingAgents(agentsByListing.get(l.id) ?? []);
    return {
      ...l,
      agentCount: rows.length,
      emailedCount: rows.filter((r) => r.state === "emailed" || r.state === "texted" || r.state === "replied").length,
      repliedCount: rows.filter((r) => r.state === "replied").length,
      noEmailCount: rows.filter((r) => !normalizeAgentEmail(r.email)).length,
    };
  });

  const counts: Record<ListingStatus, number> = { coming_soon: 0, active: 0, under_contract: 0, closed: 0 };
  for (const l of withSummary) counts[l.status]++;

  return { listings: withSummary, counts };
}

export type ListingDetail = {
  listing: Listing;
  agents: ListingAgent[];
  sends: ListingSend[];
  priceChanges: ListingPriceChange[];
  statusChanges: ListingStatusChange[];
  messages: import("@/types/database").ListingAgentMessage[];
  documents: ListingDocument[];
  pageEvents: ListingPageLeadEvent[];
};

export async function getListingDetail(id: string): Promise<ListingDetail | null> {
  const supabase = await createClient();
  const [{ data: listing }, { data: agents }, { data: sends }, { data: priceChanges }, { data: statusChanges }, { data: messages }, { data: documents }, pageEvents] =
    await Promise.all([
      supabase.from("listings").select("*").eq("id", id).maybeSingle(),
      supabase.from("listing_agents").select("*").eq("listing_id", id).order("created_at", { ascending: false }),
      supabase.from("listing_sends").select("*").eq("listing_id", id).order("created_at", { ascending: false }),
      supabase.from("listing_price_changes").select("*").eq("listing_id", id).order("occurred_at", { ascending: false }),
      supabase.from("listing_status_changes").select("*").eq("listing_id", id).order("occurred_at", { ascending: false }),
      supabase.from("listing_agent_messages").select("*").eq("listing_id", id).order("occurred_at", { ascending: false }).limit(80),
      supabase.from("listing_documents").select("*").eq("listing_id", id),
      getListingPageEvents(id),
    ]);

  if (!listing) return null;
  return {
    listing,
    agents: agents ?? [],
    sends: sends ?? [],
    priceChanges: priceChanges ?? [],
    statusChanges: (statusChanges ?? []) as ListingStatusChange[],
    messages: messages ?? [],
    documents: documents ?? [],
    pageEvents,
  };
}

export async function getListingPageEvents(listingId: string): Promise<ListingPageLeadEvent[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activities")
    .select("id, body, occurred_at, metadata, dedupe_field, contacts(first_name, last_name)")
    .eq("source", "listing_page")
    .order("occurred_at", { ascending: false })
    .limit(80);

  const events: ListingPageLeadEvent[] = [];
  for (const row of data ?? []) {
    const metadata = (row.metadata ?? {}) as Record<string, unknown>;
    if (metadata.listing_id !== listingId) continue;
    const kind = classifyListingPageActivity({ body: row.body, dedupe_field: row.dedupe_field, metadata });
    if (!kind) continue;
    const contact = row.contacts as { first_name?: string; last_name?: string } | { first_name?: string; last_name?: string }[] | null;
    const person = Array.isArray(contact) ? contact[0] : contact;
    const name = [person?.first_name, person?.last_name].filter(Boolean).join(" ").trim() || "Investor";
    events.push({ id: row.id as string, kind, occurred_at: row.occurred_at as string, name, body: row.body });
  }
  return events;
}

export type SendWithProgress = ListingSend & { total: number; sent: number; failed: number; skipped: number; pending: number };

export async function getSendProgress(sendIds: string[]): Promise<Map<string, { total: number; sent: number; failed: number; skipped: number; pending: number }>> {
  const supabase = await createClient();
  const map = new Map<string, { total: number; sent: number; failed: number; skipped: number; pending: number }>();
  if (sendIds.length === 0) return map;

  const { data: recipients } = await supabase.from("listing_send_recipients").select("send_id, status").in("send_id", sendIds);
  for (const id of sendIds) map.set(id, { total: 0, sent: 0, failed: 0, skipped: 0, pending: 0 });
  for (const r of recipients ?? []) {
    const entry = map.get(r.send_id);
    if (!entry) continue;
    entry.total++;
    if (r.status === "sent") entry.sent++;
    else if (r.status === "failed") entry.failed++;
    else if (r.status === "skipped") entry.skipped++;
    else entry.pending++;
  }
  return map;
}

export type AgentWithStats = Agent & { listingCount: number; sources: string[] };

export async function getAgentDirectory(): Promise<AgentWithStats[]> {
  const supabase = await createClient();
  const [{ data: agents }, { data: listingAgents }] = await Promise.all([
    supabase.from("agents").select("*").order("name", { ascending: true }),
    supabase.from("listing_agents").select("agent_id, listing_id"),
  ]);

  const listingsByAgent = new Map<string, Set<string>>();
  for (const la of listingAgents ?? []) {
    if (!la.agent_id) continue;
    if (!listingsByAgent.has(la.agent_id)) listingsByAgent.set(la.agent_id, new Set());
    listingsByAgent.get(la.agent_id)!.add(la.listing_id);
  }

  const withStats: AgentWithStats[] = (agents ?? []).map((a) => ({
    ...a,
    listingCount: listingsByAgent.get(a.id)?.size ?? 0,
    sources: [a.source],
  }));

  return clusterAgentsByIdentity(withStats)
    .map((cluster) => {
      const filled = dedupeAgentsByIdentity(cluster)[0]!;
      const listingIds = new Set<string>();
      const sources = new Set<string>();
      let lastEmailed: string | null = null;
      let optedOut: string | null = null;
      for (const row of cluster) {
        for (const listingId of listingsByAgent.get(row.id) ?? []) listingIds.add(listingId);
        sources.add(row.source);
        if (row.last_emailed_at && (!lastEmailed || row.last_emailed_at > lastEmailed)) lastEmailed = row.last_emailed_at;
        if (row.opted_out_at && (!optedOut || row.opted_out_at < optedOut)) optedOut = row.opted_out_at;
      }
      return {
        ...filled,
        listingCount: listingIds.size,
        sources: [...sources],
        last_emailed_at: lastEmailed,
        opted_out_at: optedOut,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

// For the "agent replies" line on the Listings nav item / Today - inbound
// agent messages across every listing that haven't been read/replied to
// yet. Deliberately excluded from the Messages inbox badge and every
// other metric (README: "excluded from the inbox badge and every
// metric").
export async function getUnansweredAgentMessageCount(): Promise<number> {
  const supabase = await createClient();
  const { data: inbound } = await supabase.from("listing_agent_messages").select("listing_agent_id, agent_id, occurred_at").eq("direction", "inbound");
  const { data: outbound } = await supabase.from("listing_agent_messages").select("listing_agent_id, agent_id, occurred_at").eq("direction", "outbound");

  const lastOutboundByKey = new Map<string, string>();
  for (const m of outbound ?? []) {
    const key = m.listing_agent_id ?? m.agent_id;
    if (!key) continue;
    const existing = lastOutboundByKey.get(key);
    if (!existing || m.occurred_at > existing) lastOutboundByKey.set(key, m.occurred_at);
  }

  const keysWithUnanswered = new Set<string>();
  for (const m of inbound ?? []) {
    const key = m.listing_agent_id ?? m.agent_id;
    if (!key) continue;
    const lastReply = lastOutboundByKey.get(key);
    if (!lastReply || m.occurred_at > lastReply) keysWithUnanswered.add(key);
  }
  return keysWithUnanswered.size;
}
