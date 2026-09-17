// Pure split for listing RP text blasts: Fresh vs Recent, driven by the
// last outbound SMS timestamp already stored for that agent.
//
// "Last outbound text" is resolved in lib/data/listing-outbound-texts.ts
// from existing tables (not a parallel history):
//   1. listing_send_recipients.sent_at (via listing_sends.channel = text)
//   2. listing_agent_messages.occurred_at (outbound + channel = text)
//   3. activities.occurred_at (type = text, direction = outbound, source = quo)
//      matched by phone when the same person was texted as a contact
//
// Recency is cross-listing: an agent texted yesterday about another
// property still lands in Recent on this listing's blast.

export const DEFAULT_RECENT_TEXT_DAYS = 2;
export const MIN_RECENT_TEXT_DAYS = 1;
export const MAX_RECENT_TEXT_DAYS = 90;

export type ListingTextBucket = "fresh" | "recent";

export function clampRecentTextDays(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_RECENT_TEXT_DAYS;
  return Math.min(MAX_RECENT_TEXT_DAYS, Math.max(MIN_RECENT_TEXT_DAYS, Math.floor(value)));
}

export function isRecentOutboundText(lastOutboundAt: string | null | undefined, days: number, nowMs = Date.now()): boolean {
  if (!lastOutboundAt) return false;
  const at = new Date(lastOutboundAt).getTime();
  if (!Number.isFinite(at)) return false;
  const windowMs = clampRecentTextDays(days) * 24 * 60 * 60 * 1000;
  return nowMs - at <= windowMs;
}

export function listingTextBucket(lastOutboundAt: string | null | undefined, days: number, nowMs = Date.now()): ListingTextBucket {
  return isRecentOutboundText(lastOutboundAt, days, nowMs) ? "recent" : "fresh";
}

export function neverOutboundTexted(lastOutboundAt: string | null | undefined): boolean {
  return !lastOutboundAt;
}
