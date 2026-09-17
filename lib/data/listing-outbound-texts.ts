import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/phone";
import type { ListingAgent } from "@/types/database";

export type ListingAgentTextRecency = {
  // listing_agents.id on THIS listing → last outbound SMS ISO, if any.
  lastOutboundAtByAgentId: Record<string, string>;
  // Pending text recipients on an in-progress send for THIS listing —
  // already queued, so the composer leaves them out of both buckets.
  queuedOnThisListing: string[];
};

type AgentRef = Pick<ListingAgent, "id" | "agent_id" | "phone">;

type SendJoin = {
  listing_agent_id: string;
  sent_at: string | null;
  status: string;
  listing_sends: { channel: string; status: string; created_at: string; listing_id: string } | { channel: string; status: string; created_at: string; listing_id: string }[] | null;
};

function asSend(row: SendJoin["listing_sends"]): { channel: string; status: string; created_at: string; listing_id: string } | null {
  if (!row) return null;
  return Array.isArray(row) ? (row[0] ?? null) : row;
}

function takeMax(map: Map<string, string>, id: string, at: string) {
  const cur = map.get(id);
  if (!cur || at > cur) map.set(id, at);
}

async function selectInChunks<T>(ids: string[], fn: (chunk: string[]) => Promise<T[] | null>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const rows = await fn(ids.slice(i, i + 200));
    if (rows?.length) out.push(...rows);
  }
  return out;
}

// Last outbound SMS per RP-list row, across every listing (same agent_id
// or same phone), plus contact-thread texts when that phone exists on a
// contact. Used by the listing composer to split Fresh vs Recent without
// inventing a new history table.
export async function fetchListingAgentTextRecency(listingId: string, agents: AgentRef[]): Promise<ListingAgentTextRecency> {
  if (agents.length === 0) return { lastOutboundAtByAgentId: {}, queuedOnThisListing: [] };

  const supabase = await createClient();
  return loadListingAgentTextRecency(supabase, listingId, agents);
}

export async function loadListingAgentTextRecency(
  supabase: SupabaseClient,
  listingId: string,
  agents: AgentRef[],
): Promise<ListingAgentTextRecency> {
  const targetIds = agents.map((a) => a.id);
  const agentIds = [...new Set(agents.map((a) => a.agent_id).filter((id): id is string => !!id))];
  const targetIdsByPhone = new Map<string, string[]>();
  const targetIdsByAgentId = new Map<string, string[]>();

  for (const a of agents) {
    const phone = normalizePhone(a.phone);
    if (phone) {
      const list = targetIdsByPhone.get(phone) ?? [];
      list.push(a.id);
      targetIdsByPhone.set(phone, list);
    }
    if (a.agent_id) {
      const list = targetIdsByAgentId.get(a.agent_id) ?? [];
      list.push(a.id);
      targetIdsByAgentId.set(a.agent_id, list);
    }
  }

  const { data: allListingAgents } = await supabase.from("listing_agents").select("id, agent_id, phone").limit(8000);

  const relatedIds = new Set<string>(targetIds);
  const relatedIdToTargets = new Map<string, string[]>();
  for (const id of targetIds) relatedIdToTargets.set(id, [id]);

  for (const row of allListingAgents ?? []) {
    const phone = normalizePhone(row.phone);
    const viaAgent = row.agent_id ? targetIdsByAgentId.get(row.agent_id) : undefined;
    const viaPhone = phone ? targetIdsByPhone.get(phone) : undefined;
    const targets = [...new Set([...(viaAgent ?? []), ...(viaPhone ?? [])])];
    if (targets.length === 0) continue;
    relatedIds.add(row.id);
    const existing = relatedIdToTargets.get(row.id) ?? [];
    relatedIdToTargets.set(row.id, [...new Set([...existing, ...targets])]);
  }

  const relatedIdList = [...relatedIds];
  const lastByTarget = new Map<string, string>();
  const queuedOnThisListing = new Set<string>();

  const sendRows = await selectInChunks(relatedIdList, async (chunk) => {
    const { data } = await supabase
      .from("listing_send_recipients")
      .select("listing_agent_id, sent_at, status, listing_sends!inner(channel, status, created_at, listing_id)")
      .in("listing_agent_id", chunk)
      .in("status", ["sent", "pending"])
      .limit(5000);
    return (data ?? []) as unknown as SendJoin[];
  });

  for (const row of sendRows) {
    const send = asSend(row.listing_sends);
    if (!send || send.channel !== "text" || send.status === "canceled") continue;
    const at = row.sent_at ?? send.created_at;
    if (!at) continue;
    if (send.listing_id === listingId && row.status === "pending" && targetIds.includes(row.listing_agent_id)) {
      queuedOnThisListing.add(row.listing_agent_id);
    }
    for (const targetId of relatedIdToTargets.get(row.listing_agent_id) ?? []) {
      takeMax(lastByTarget, targetId, at);
    }
  }

  const messageRows = await selectInChunks(relatedIdList, async (chunk) => {
    const { data } = await supabase
      .from("listing_agent_messages")
      .select("listing_agent_id, agent_id, occurred_at")
      .eq("direction", "outbound")
      .eq("channel", "text")
      .in("listing_agent_id", chunk)
      .order("occurred_at", { ascending: false })
      .limit(5000);
    return data ?? [];
  });

  if (agentIds.length > 0) {
    const byAgentId = await selectInChunks(agentIds, async (chunk) => {
      const { data } = await supabase
        .from("listing_agent_messages")
        .select("listing_agent_id, agent_id, occurred_at")
        .eq("direction", "outbound")
        .eq("channel", "text")
        .in("agent_id", chunk)
        .order("occurred_at", { ascending: false })
        .limit(5000);
      return data ?? [];
    });
    messageRows.push(...byAgentId);
  }

  for (const row of messageRows) {
    if (row.listing_agent_id) {
      for (const targetId of relatedIdToTargets.get(row.listing_agent_id) ?? []) {
        takeMax(lastByTarget, targetId, row.occurred_at);
      }
    }
    if (row.agent_id) {
      for (const targetId of targetIdsByAgentId.get(row.agent_id) ?? []) {
        takeMax(lastByTarget, targetId, row.occurred_at);
      }
    }
  }

  const phones = [...targetIdsByPhone.keys()];
  if (phones.length > 0) {
    const { data: contacts } = await supabase.from("contacts").select("id, phone, secondary_phone").limit(8000);
    const contactIdToTargets = new Map<string, string[]>();
    for (const c of contacts ?? []) {
      const targets = new Set<string>();
      for (const raw of [c.phone, c.secondary_phone]) {
        const phone = normalizePhone(raw);
        for (const id of (phone ? targetIdsByPhone.get(phone) : undefined) ?? []) targets.add(id);
      }
      if (targets.size > 0) contactIdToTargets.set(c.id, [...targets]);
    }

    const contactIds = [...contactIdToTargets.keys()];
    if (contactIds.length > 0) {
      const activityRows = await selectInChunks(contactIds, async (chunk) => {
        const { data } = await supabase
          .from("activities")
          .select("contact_id, occurred_at")
          .eq("type", "text")
          .eq("direction", "outbound")
          .eq("source", "quo")
          .in("contact_id", chunk)
          .order("occurred_at", { ascending: false })
          .limit(5000);
        return data ?? [];
      });
      for (const row of activityRows) {
        for (const targetId of contactIdToTargets.get(row.contact_id) ?? []) {
          takeMax(lastByTarget, targetId, row.occurred_at);
        }
      }
    }
  }

  const lastOutboundAtByAgentId: Record<string, string> = {};
  for (const [id, at] of lastByTarget) lastOutboundAtByAgentId[id] = at;

  return { lastOutboundAtByAgentId, queuedOnThisListing: [...queuedOnThisListing] };
}
