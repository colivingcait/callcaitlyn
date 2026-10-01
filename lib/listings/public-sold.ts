import { publicListingPrivacy } from "@/lib/listings/public-privacy";
import { PROPERTY_TYPE_LABELS } from "@/lib/utils";
import type { DealSide, PropertyType } from "@/types/database";

// Recently sold is deals-based (won deals), not archived listing cards.
// Every sold row is off market, so publicListingPrivacy treats it as PRIVATE:
// nickname + submarket only. The deal address is used only to match an
// archived listing's nickname and submarket. It is never a label.

export function normalizeListingAddress(address: string): string {
  return address.toLowerCase().replace(/[.#,]/g, " ").replace(/\s+/g, " ").trim();
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

export type PublicSoldListingMatch = {
  nickname?: string | null;
  submarket?: string | null;
  public_category?: string | null;
};

export type PublicSoldEntry = {
  id: string;
  closed: string;
  name: string;
  locationLabel: string;
  detail: string;
};

export function toPublicSoldEntry(
  deal: {
    id: string;
    property_type: PropertyType | null;
    side: DealSide | null;
    on_fmls: boolean;
    closed_at: string;
  },
  listing?: PublicSoldListingMatch | null,
): PublicSoldEntry {
  const privacy = publicListingPrivacy({
    nickname: listing?.nickname ?? null,
    submarket: listing?.submarket ?? null,
    public_category: listing?.public_category ?? null,
    status: "archived",
    zillow_url: null,
  });
  return {
    id: deal.id,
    closed: publicSoldClosedLabel(deal.closed_at),
    name: privacy.displayTitle,
    locationLabel: privacy.locationLabel,
    detail: publicSoldDetail(deal),
  };
}
