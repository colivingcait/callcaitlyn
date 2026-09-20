import { formatCurrency } from "@/lib/utils";
import { STATUS_LABEL } from "@/lib/listings/status";
import type { ListingAgentMessage, ListingPriceChange, ListingSend, ListingStatus } from "@/types/database";

export const RP_AUDIENCE_LABEL: Record<string, string> = {
  all: "Everyone eligible",
  not_contacted: "Not contacted",
  non_repliers: "Non-repliers",
};

export type ListingTimelineKind = "status" | "price" | "rp_blast" | "inbound_agent" | "investor_unlock" | "offer" | "created";

export type ListingStatusChange = {
  id: string;
  old_status: ListingStatus | null;
  new_status: ListingStatus;
  occurred_at: string;
};

export type ListingPageLeadEvent = {
  id: string;
  kind: "unlock" | "offer";
  occurred_at: string;
  name: string;
  body: string | null;
};

export type ListingTimelineEvent = {
  key: string;
  kind: ListingTimelineKind;
  when: string;
  title: string;
  detail?: string;
  href?: string;
  hrefLabel?: string;
  callBackPhone?: string | null;
  agentName?: string;
  brokerage?: string | null;
};

export type ListingAgentTouch = ListingAgentMessage & {
  name: string;
  brokerage: string | null;
  phone: string | null;
  email: string | null;
  alreadyPartner?: boolean;
};

export type AgentRailRow = {
  key: string;
  name: string;
  brokerage: string | null;
  lastChannel: "Call" | "Text" | "Email";
  phone: string | null;
  email: string | null;
  alreadyPartner: boolean;
};

export function rpAudienceLabel(audience: string | null | undefined): string {
  if (!audience) return "RP audience";
  return RP_AUDIENCE_LABEL[audience] ?? audience;
}

export function rpBlastTemplateName(send: Pick<ListingSend, "channel" | "subject" | "message">): string {
  const subject = send.subject?.trim();
  if (subject) return subject;
  const preview = send.message.trim().split(/\n/)[0]?.trim() ?? "";
  if (preview) return preview.slice(0, 48);
  return send.channel === "email" ? "RP email" : "RP text";
}

export function rpBlastHref(listingId: string, sendId: string): string {
  return `/listings/${listingId}?tab=rp#listing-send-${sendId}`;
}

export function lastChannelLabel(channel: ListingAgentMessage["channel"]): "Call" | "Text" | "Email" {
  if (channel === "call") return "Call";
  if (channel === "email") return "Email";
  return "Text";
}

function statusLabel(status: ListingStatus | null | undefined): string {
  if (!status) return "Unknown";
  return STATUS_LABEL[status] ?? status;
}

export function buildListingTimeline(input: {
  listingId: string;
  listingCreatedAt: string;
  statusChanges: ListingStatusChange[];
  priceChanges: ListingPriceChange[];
  sends: (ListingSend & { audience?: string | null })[];
  messages: ListingAgentTouch[];
  pageEvents: ListingPageLeadEvent[];
}): ListingTimelineEvent[] {
  const events: ListingTimelineEvent[] = [];

  events.push({
    key: "created",
    kind: "created",
    when: input.listingCreatedAt,
    title: "Listing created",
  });

  for (const change of input.statusChanges) {
    const from = change.old_status ? statusLabel(change.old_status) : null;
    events.push({
      key: `status:${change.id}`,
      kind: "status",
      when: change.occurred_at,
      title: from ? `Status · ${from} → ${statusLabel(change.new_status)}` : `Status · ${statusLabel(change.new_status)}`,
    });
  }

  for (const price of input.priceChanges) {
    events.push({
      key: `price:${price.id}`,
      kind: "price",
      when: price.occurred_at,
      title: `Price · ${formatCurrency(price.old_price)} → ${formatCurrency(price.new_price)}`,
    });
  }

  for (const send of input.sends) {
    if (send.status === "canceled") continue;
    const audience = rpAudienceLabel(send.audience);
    events.push({
      key: `send:${send.id}`,
      kind: "rp_blast",
      when: send.created_at,
      title: `RP blast sent · ${rpBlastTemplateName(send)}`,
      detail: audience,
      href: rpBlastHref(input.listingId, send.id),
      hrefLabel: audience,
    });
  }

  for (const message of input.messages) {
    if (message.direction !== "inbound") continue;
    const channel = lastChannelLabel(message.channel).toLowerCase();
    const brokerage = message.brokerage?.trim() || null;
    events.push({
      key: `inbound:${message.id}`,
      kind: "inbound_agent",
      when: message.occurred_at,
      title: brokerage ? `Inbound ${channel} · ${message.name} · ${brokerage}` : `Inbound ${channel} · ${message.name}`,
      detail: message.body?.trim() || undefined,
      callBackPhone: message.phone,
      agentName: message.name,
      brokerage,
    });
  }

  for (const lead of input.pageEvents) {
    if (lead.kind === "unlock") {
      events.push({
        key: `unlock:${lead.id}`,
        kind: "investor_unlock",
        when: lead.occurred_at,
        title: `Investor unlocked · ${lead.name}`,
        detail: "Public OM unlock",
      });
    } else {
      events.push({
        key: `offer:${lead.id}`,
        kind: "offer",
        when: lead.occurred_at,
        title: `Offer terms submitted · ${lead.name}`,
        detail: lead.body ?? undefined,
      });
    }
  }

  return events.sort((a, b) => b.when.localeCompare(a.when));
}

export function buildAgentRail(
  messages: ListingAgentTouch[],
  alreadyPartner: (agent: Pick<ListingAgentTouch, "phone" | "email">) => boolean = () => false,
): AgentRailRow[] {
  const latestByAgent = new Map<string, ListingAgentTouch>();
  for (const message of messages) {
    const key = message.listing_agent_id ?? message.agent_id ?? message.id;
    if (!latestByAgent.has(key)) latestByAgent.set(key, message);
  }
  return [...latestByAgent.values()].map((message) => ({
    key: message.listing_agent_id ?? message.agent_id ?? message.id,
    name: message.name,
    brokerage: message.brokerage,
    lastChannel: lastChannelLabel(message.channel),
    phone: message.phone,
    email: message.email,
    alreadyPartner: Boolean(message.alreadyPartner) || alreadyPartner(message),
  }));
}

export function classifyListingPageActivity(row: { body: string | null; dedupe_field?: string | null; metadata?: Record<string, unknown> | null }): "unlock" | "offer" | null {
  const field = row.dedupe_field ?? "";
  if (field === "listing_unlock_key") return "unlock";
  if (field === "listing_offer_key") return "offer";
  const body = (row.body ?? "").toLowerCase();
  if (body.startsWith("unlocked financials") || body.includes("unlocked financials")) return "unlock";
  if (body.startsWith("offer on") || (row.metadata && "offer" in row.metadata)) return "offer";
  return null;
}
