import { normalizePhone } from "@/lib/phone";
import type { ListingAgentState } from "@/types/database";

// Collapse listing RP rows and the cross-listing agent directory so the
// same person is one row. Reverse-prospecting imports are keyed by buyer
// ref, so one agent can appear three times; the directory only upserted
// by email, so the same phone (or a name-only paste) could land twice.
//
// Match keys — any one means the same person (union-find, so phone+email
// chains collapse too):
//   1. Normalized phone (digits, last 10 — same as listing-text-dedupe)
//   2. Normalized email (trim + lowercase)
//   3. Normalized name, but ONLY when BOTH rows have no phone and no
//      email. Two "John Smith"s with different numbers stay two people.
//
// Canonical row: richest contact (real name + phone + email). Ties keep
// the first row in list order. Empty name/phone/email/brokerage on that
// row are filled from siblings so the list shows the complete person.
// Send still picks a cluster member that actually has the channel field
// on the DB row.

export type AgentIdentityFields = {
  name: string;
  phone?: string | null;
  email?: string | null;
  brokerage?: string | null;
};

export function normalizeAgentEmail(email: string | null | undefined): string | null {
  const trimmed = email?.trim().toLowerCase() ?? "";
  if (!trimmed || !trimmed.includes("@")) return null;
  return trimmed;
}

export function normalizeAgentName(name: string | null | undefined): string | null {
  const trimmed = (name ?? "").trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  if (!/[A-Za-z]/.test(trimmed)) return null;
  return trimmed.toLowerCase();
}

export function agentIdentityRichness(row: AgentIdentityFields): number {
  const named = normalizeAgentName(row.name) ? 4 : 0;
  const phone = normalizePhone(row.phone) ? 2 : 0;
  const email = normalizeAgentEmail(row.email) ? 2 : 0;
  return named + phone + email;
}

export function pickRichestAgentIdentity<T extends AgentIdentityFields>(current: T, candidate: T): T {
  return agentIdentityRichness(candidate) > agentIdentityRichness(current) ? candidate : current;
}

function findRoot(parent: number[], i: number): number {
  let r = i;
  while (parent[r] !== r) r = parent[r];
  let x = i;
  while (parent[x] !== r) {
    const next = parent[x];
    parent[x] = r;
    x = next;
  }
  return r;
}

function unite(parent: number[], rank: number[], a: number, b: number) {
  let ra = findRoot(parent, a);
  let rb = findRoot(parent, b);
  if (ra === rb) return;
  if (rank[ra] < rank[rb]) [ra, rb] = [rb, ra];
  parent[rb] = ra;
  if (rank[ra] === rank[rb]) rank[ra]++;
}

export function clusterAgentsByIdentity<T extends AgentIdentityFields>(rows: T[]): T[][] {
  const n = rows.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const rank = new Array<number>(n).fill(0);

  const byPhone = new Map<string, number>();
  const byEmail = new Map<string, number>();
  const byNameOnly = new Map<string, number>();

  for (let i = 0; i < n; i++) {
    const phone = normalizePhone(rows[i].phone);
    const email = normalizeAgentEmail(rows[i].email);
    const name = normalizeAgentName(rows[i].name);

    if (phone) {
      const prev = byPhone.get(phone);
      if (prev !== undefined) unite(parent, rank, prev, i);
      else byPhone.set(phone, i);
    }
    if (email) {
      const prev = byEmail.get(email);
      if (prev !== undefined) unite(parent, rank, prev, i);
      else byEmail.set(email, i);
    }
    if (!phone && !email && name) {
      const prev = byNameOnly.get(name);
      if (prev !== undefined) unite(parent, rank, prev, i);
      else byNameOnly.set(name, i);
    }
  }

  const members = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = findRoot(parent, i);
    const list = members.get(root);
    if (list) list.push(i);
    else members.set(root, [i]);
  }

  const seen = new Set<number>();
  const clusters: T[][] = [];
  for (let i = 0; i < n; i++) {
    const root = findRoot(parent, i);
    if (seen.has(root)) continue;
    seen.add(root);
    clusters.push((members.get(root) ?? []).map((idx) => rows[idx]));
  }
  return clusters;
}

function fillCanonicalIdentity<T extends AgentIdentityFields>(cluster: T[]): T {
  const winner = cluster.reduce((current, row) => pickRichestAgentIdentity(current, row));
  const out = { ...winner };
  for (const row of cluster) {
    if (!normalizeAgentName(out.name) && normalizeAgentName(row.name)) out.name = row.name;
    if (!normalizePhone(out.phone) && normalizePhone(row.phone)) out.phone = row.phone;
    if (!normalizeAgentEmail(out.email) && normalizeAgentEmail(row.email)) out.email = row.email;
    if (!(out.brokerage && out.brokerage.trim()) && row.brokerage?.trim()) out.brokerage = row.brokerage;
  }
  return out;
}

export function dedupeAgentsByIdentity<T extends AgentIdentityFields>(rows: T[]): T[] {
  return clusterAgentsByIdentity(rows).map((cluster) => fillCanonicalIdentity(cluster));
}

const LISTING_AGENT_STATE_RANK: Record<string, number> = {
  not_contacted: 0,
  emailed: 1,
  texted: 1,
  replied: 2,
  opted_out: 3,
};

type ListingAgentIdentity = AgentIdentityFields & {
  state: ListingAgentState;
  replied_at?: string | null;
};

function overlayListingAgentState<T extends ListingAgentIdentity>(cluster: T[]): ListingAgentState {
  let best: ListingAgentState = cluster[0]!.state;
  let bestRank = LISTING_AGENT_STATE_RANK[best] ?? 0;
  for (const row of cluster) {
    const rank = LISTING_AGENT_STATE_RANK[row.state] ?? 0;
    if (rank > bestRank) {
      best = row.state;
      bestRank = rank;
    }
  }
  return best;
}

function latestRepliedAt<T extends ListingAgentIdentity>(cluster: T[]): string | null {
  let latest: string | null = null;
  for (const row of cluster) {
    const at = row.replied_at ?? null;
    if (at && (!latest || at > latest)) latest = at;
  }
  return latest;
}

// One person per listing RP list. State is the most advanced / most
// protective in the cluster (opted-out wins, then replied, then contacted)
// so a duplicate buyer-ref row cannot hide an opt-out or a reply.
export function collapseListingAgents<T extends ListingAgentIdentity>(rows: T[]): T[] {
  return clusterAgentsByIdentity(rows).map((cluster) => {
    const filled = fillCanonicalIdentity(cluster);
    return { ...filled, state: overlayListingAgentState(cluster), replied_at: latestRepliedAt(cluster) };
  });
}

export function selectListingSendRecipients<T extends ListingAgentIdentity & { id: string }>(
  agents: T[],
  opts: {
    channel: "email" | "text";
    audienceFilter: (state: string) => boolean;
    allowedIds?: Set<string> | null;
  },
): T[] {
  const out: T[] = [];
  for (const cluster of clusterAgentsByIdentity(agents)) {
    if (opts.allowedIds && !cluster.some((row) => opts.allowedIds!.has(row.id))) continue;
    if (cluster.some((row) => row.state === "opted_out")) continue;
    if (!opts.allowedIds && !opts.audienceFilter(overlayListingAgentState(cluster))) continue;

    const withContact = cluster.filter((row) => (opts.channel === "email" ? !!normalizeAgentEmail(row.email) : !!normalizePhone(row.phone)));
    if (withContact.length === 0) continue;
    out.push(withContact.reduce((current, row) => pickRichestAgentIdentity(current, row)));
  }
  return out;
}
