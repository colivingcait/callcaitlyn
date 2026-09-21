import { publicListingCopy } from "@/lib/listings/public-copy";
import { PROPERTY_TYPE_LABELS } from "@/lib/utils";
import type { DealSide, PropertyType } from "@/types/database";

// Product decision for the Recently sold label:
// 1. Prefer an archived listing's nickname when the deal address matches that
//    listing's address (same house, already has a public identity).
//    Archived listings are not sold cards themselves — the strip stays
//    deals-based (won deals).
// 2. Otherwise use the street name from deal.address with the house number
//    stripped — nickname-style, no street number.
// Never use client_name, notes, or a full street address.

export function normalizeListingAddress(address: string): string {
  return address.toLowerCase().replace(/[.#,]/g, " ").replace(/\s+/g, " ").trim();
}

export function publicSoldNickname(address: string | null | undefined, listingNickname?: string | null): string | null {
  const nickname = publicListingCopy(listingNickname);
  if (nickname) return nickname;
  if (!address) return null;

  const street = address.split(",")[0]?.trim() ?? "";
  const stripped = street
    .replace(/^\d+[A-Za-z]?(?:\s*-\s*\d+[A-Za-z]?)?\s+/, "")
    .replace(/^(?:unit|apt|ste|suite|#)\s*\S+\s+/i, "")
    .trim();

  if (!stripped || /^\d/.test(stripped) || stripped.length < 3) return null;
  return stripped;
}

export function publicSoldDetail(deal: {
  property_type: PropertyType | null;
  side: DealSide | null;
  on_fmls: boolean;
}): string {
  const parts: string[] = [];
  if (deal.property_type === "co_living") parts.push("coliving");
  else if (deal.property_type) parts.push(PROPERTY_TYPE_LABELS[deal.property_type] ?? deal.property_type);
  if (deal.side === "buyer") parts.push("buyer side");
  else if (deal.side === "seller") parts.push("listing side");
  if (!deal.on_fmls) parts.push("off-market");
  return parts.join(" · ");
}

export function publicSoldClosedLabel(closedAt: string): string {
  const date = new Date(closedAt);
  const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
  const year = date.toLocaleString("en-US", { year: "numeric", timeZone: "UTC" });
  return `CLOSED ${month} ${year}`;
}

export type PublicSoldEntry = {
  id: string;
  closed: string;
  name: string;
  detail: string;
};

export function toPublicSoldEntry(
  deal: {
    id: string;
    address: string | null;
    property_type: PropertyType | null;
    side: DealSide | null;
    on_fmls: boolean;
    closed_at: string;
  },
  listingNickname?: string | null,
): PublicSoldEntry | null {
  const name = publicSoldNickname(deal.address, listingNickname);
  if (!name) return null;
  return {
    id: deal.id,
    closed: publicSoldClosedLabel(deal.closed_at),
    name,
    detail: publicSoldDetail(deal),
  };
}
