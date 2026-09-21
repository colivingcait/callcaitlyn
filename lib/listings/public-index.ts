import { publicListingCopy } from "@/lib/listings/public-copy";
import {
  isColivingCategory,
  parsePublicCategory,
  publicCategoryColor,
  publicCategoryTag,
  publicListingHref,
} from "@/lib/listings/public-category";
import { submarketCentroid } from "@/lib/listings/submarkets";
import { formatCurrency } from "@/lib/utils";
import { isPublicAvailableStatus, isPublicUnderContractStatus } from "@/lib/listings/status";
import type { ListingStatus } from "@/types/database";

export type PublicIndexSource = {
  id: string;
  nickname: string | null;
  property_type: string | null;
  public_category: string | null;
  public_slug: string | null;
  zillow_url: string | null;
  submarket: string | null;
  list_price: number | null;
  status: ListingStatus;
  created_at: string;
  coverPhotoUrl: string | null;
  liveOccupied: number | null;
  liveTotal: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
};

export type PublicIndexCard = {
  id: string;
  name: string;
  submarketLabel: string | null;
  priceLabel: string;
  tag: string | null;
  tagColor: string;
  coverPhotoUrl: string | null;
  photoCaption: string;
  href: string | null;
  external: boolean;
  cta: string | null;
  detail: string | null;
  lat: number | null;
  lng: number | null;
};

export function sortPublicListings<T extends { public_category: string | null; created_at: string }>(listings: T[]): T[] {
  return [...listings].sort((a, b) => {
    const aColiving = isColivingCategory(a.public_category) ? 0 : 1;
    const bColiving = isColivingCategory(b.public_category) ? 0 : 1;
    if (aColiving !== bColiving) return aColiving - bColiving;
    return b.created_at.localeCompare(a.created_at);
  });
}

export function partitionPublicListings<T extends { status: ListingStatus }>(listings: T[]): {
  available: T[];
  underContract: T[];
} {
  const available: T[] = [];
  const underContract: T[] = [];
  for (const listing of listings) {
    if (isPublicUnderContractStatus(listing.status)) underContract.push(listing);
    else if (isPublicAvailableStatus(listing.status)) available.push(listing);
  }
  return { available, underContract };
}

export function underContractDetail(listing: PublicIndexSource): string | null {
  const category = parsePublicCategory(listing.public_category);
  if (category === "coliving" || (category == null && listing.public_slug)) {
    if (listing.liveTotal != null && listing.liveOccupied != null) {
      return `${listing.liveTotal} rooms · ${listing.liveOccupied} of ${listing.liveTotal} occupied`;
    }
    if (listing.liveTotal != null) return `${listing.liveTotal} rooms`;
    return null;
  }
  const parts = [
    listing.beds != null ? `${listing.beds} bd` : null,
    listing.baths != null ? `${listing.baths} ba` : null,
    listing.sqft ? `${listing.sqft.toLocaleString()} sqft` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export function toPublicIndexCard(listing: PublicIndexSource): PublicIndexCard {
  const link = publicListingHref(listing);
  const centroid = submarketCentroid(listing.submarket);
  const submarket = publicListingCopy(listing.submarket);
  return {
    id: listing.id,
    name: publicListingCopy(listing.nickname) || "Listing",
    submarketLabel: submarket ? submarket.toUpperCase() : null,
    priceLabel: formatCurrency(listing.list_price),
    tag: publicCategoryTag(listing.public_category),
    tagColor: publicCategoryColor(listing.public_category),
    coverPhotoUrl: listing.coverPhotoUrl,
    photoCaption: isColivingCategory(listing.public_category) ? "exterior photo" : "listing photo",
    href: link?.href ?? null,
    external: link?.external ?? false,
    cta: link?.cta ?? null,
    detail: underContractDetail(listing),
    lat: centroid?.lat ?? null,
    lng: centroid?.lng ?? null,
  };
}

export function listingsQueryString(raw: Record<string, string | string[] | undefined> | undefined): string {
  if (!raw) return "";
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (key === "view") continue;
    if (typeof value === "string" && value) qs.set(key, value);
  }
  return qs.toString();
}
