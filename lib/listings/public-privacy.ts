import { looksLikeStreetAddress, ogHeroPhoto, ogPlaceName } from "@/lib/listings/og-card";
import { externalListingCta } from "@/lib/listings/public-category";
import { publicListingCopy } from "@/lib/listings/public-copy";
import { isExteriorPadsplitPhoto } from "@/lib/listings/padsplit-photos";
import type { PadsplitPhoto } from "@/types/database";

// One rule for every public listing surface (index, detail, one-pager, map, sold).
//
// Coliving: listings.public_category === "coliving". That column is the only
// public tag (migration 0081). Do not infer coliving from listings.property_type
// (free text) or deals.property_type ("co_living").
//
// On market: listings.status is coming_soon, active, or under_contract
// (isPubliclyListed). archived is off the board. Won deals are not on market.
//
// PUBLIC-ADDRESS-OK: on market AND zillow_url set AND not coliving.
// Everything else is PRIVATE.

const BARE_STREET_NAME =
  /\b(?:street|st|avenue|ave|boulevard|blvd|drive|dr|road|rd|lane|ln|way|court|ct|place|pl|terrace|ter|parkway|pkwy|circle|cir|highway|hwy|trail|trl)\.?$/i;
const ZIP = /\b\d{5}(?:-\d{4})?\b/;

export type PublicListingPrivacyInput = {
  nickname?: string | null;
  submarket?: string | null;
  public_category?: string | null;
  status?: string | null;
  zillow_url?: string | null;
};

export type PublicListingPrivacy = {
  showAddress: boolean;
  showExteriors: boolean;
  showZillow: boolean;
  showMapPin: boolean;
  displayTitle: string;
  locationLabel: string;
};

export function isColivingListing(publicCategory: string | null | undefined): boolean {
  return publicCategory === "coliving";
}

export function isOnMarketListing(status: string | null | undefined): boolean {
  return status === "coming_soon" || status === "active" || status === "under_contract";
}

function hasZillowUrl(zillowUrl: string | null | undefined): boolean {
  return Boolean(zillowUrl && zillowUrl.trim());
}

function unsafePrivateText(value: string): boolean {
  return looksLikeStreetAddress(value) || BARE_STREET_NAME.test(value) || ZIP.test(value);
}

function privatePlace(submarket: string | null | undefined): string {
  const place = ogPlaceName(submarket);
  if (!place || unsafePrivateText(place)) return "Atlanta metro";
  return place;
}

export function publicListingPrivacy(listing: PublicListingPrivacyInput): PublicListingPrivacy {
  const publicAddressOk =
    isOnMarketListing(listing.status) && hasZillowUrl(listing.zillow_url) && !isColivingListing(listing.public_category);
  const nickname = publicListingCopy(listing.nickname);
  const safeNickname = nickname && !unsafePrivateText(nickname) ? nickname : null;
  const locationLabel = publicAddressOk ? (publicListingCopy(listing.submarket) ?? "") : privatePlace(listing.submarket);
  const displayTitle = publicAddressOk ? nickname || "Listing" : safeNickname || locationLabel;

  return {
    showAddress: publicAddressOk,
    showExteriors: publicAddressOk,
    showZillow: publicAddressOk,
    showMapPin: publicAddressOk,
    displayTitle,
    locationLabel,
  };
}

// PRIVATE galleries drop exteriors the same way the OG card does: isExteriorPadsplitPhoto
// on category, alt, title, tags, and filename. Uploaded listing-photos have no exterior
// flag — they are { url, category: null } — so only the filename (and any label) can mark
// them exterior. A UUID storage path stays. If nothing interior remains, the caller shows
// the existing neutral placeholder (null cover).
export function publicGalleryPhotos(photos: PadsplitPhoto[], privacy: PublicListingPrivacy): PadsplitPhoto[] {
  const visible = privacy.showExteriors ? photos : photos.filter((photo) => !isExteriorPadsplitPhoto(photo));
  if (privacy.showAddress) return visible;
  return visible.map((photo) => ({
    url: photo.url,
    category: photo.category && !unsafePrivateText(photo.category) ? photo.category : null,
  }));
}

export function publicListingHref(listing: PublicListingPrivacyInput & {
  public_slug?: string | null;
}): { href: string; external: boolean; cta: string } | null {
  const privacy = publicListingPrivacy(listing);
  if (privacy.showZillow && listing.zillow_url) {
    return { href: listing.zillow_url, external: true, cta: externalListingCta(listing.zillow_url) };
  }
  if (listing.public_slug) {
    return { href: `/listings/${listing.public_slug}`, external: false, cta: "VIEW THE OFFERING →" };
  }
  return null;
}

export function publicInteriorCoverUrl(photos: PadsplitPhoto[]): string | null {
  return ogHeroPhoto(photos)?.url ?? null;
}

// PRIVATE body copy drops any sentence that is itself a street, bare street
// name, or zip. PUBLIC-ADDRESS-OK copy is unchanged.
export function publicBodyCopy(value: string | null | undefined, privacy: PublicListingPrivacy): string | null {
  const copy = publicListingCopy(value);
  if (!copy || privacy.showAddress) return copy;
  const kept = copy
    .split(/\n{2,}/)
    .map((paragraph) =>
      paragraph
        .split(/(?<=[.!?])\s+/)
        .filter((sentence) => !unsafePrivateText(sentence.trim()))
        .join(" ")
        .trim(),
    )
    .filter(Boolean);
  return kept.length ? kept.join("\n\n") : null;
}
