import type { ListingPublicCategory } from "@/types/database";

export const LISTING_PUBLIC_CATEGORIES = ["coliving", "airbnb", "long_term_rental", "primary_residence"] as const;

export const PUBLIC_CATEGORY_TAG: Record<ListingPublicCategory, string> = {
  coliving: "COLIVING",
  airbnb: "AIRBNB",
  long_term_rental: "LONG TERM RENTAL",
  primary_residence: "PRIMARY RESIDENCE",
};

export const PUBLIC_CATEGORY_LABEL: Record<ListingPublicCategory, string> = {
  coliving: "Coliving",
  airbnb: "AirBnB",
  long_term_rental: "Long Term Rental",
  primary_residence: "Primary Residence",
};

const CATEGORY_SET = new Set<string>(LISTING_PUBLIC_CATEGORIES);

export function parsePublicCategory(value: string | null | undefined): ListingPublicCategory | null {
  if (!value) return null;
  return CATEGORY_SET.has(value) ? (value as ListingPublicCategory) : null;
}

export function isColivingCategory(value: string | null | undefined): boolean {
  return parsePublicCategory(value) === "coliving";
}

export function publicCategoryTag(value: string | null | undefined): string | null {
  const category = parsePublicCategory(value);
  return category ? PUBLIC_CATEGORY_TAG[category] : null;
}

export function publicCategoryColor(value: string | null | undefined): string {
  return isColivingCategory(value) ? "#cc4a37" : "#211c19";
}

export function externalListingCta(url: string): string {
  if (/fmls|firstmls|flexmls/i.test(url)) return "VIEW ON FMLS ↗";
  return "VIEW ON ZILLOW ↗";
}

export function publicListingHref(listing: {
  public_category: string | null;
  public_slug: string | null;
  zillow_url: string | null;
}): { href: string; external: boolean; cta: string } | null {
  const category = parsePublicCategory(listing.public_category);
  if (category === "coliving") {
    if (listing.public_slug) return { href: `/listing/${listing.public_slug}`, external: false, cta: "VIEW THE OFFERING →" };
    if (listing.zillow_url) return { href: listing.zillow_url, external: true, cta: externalListingCta(listing.zillow_url) };
    return null;
  }
  if (listing.zillow_url) {
    return { href: listing.zillow_url, external: true, cta: externalListingCta(listing.zillow_url) };
  }
  if (listing.public_slug) {
    return { href: `/listing/${listing.public_slug}`, external: false, cta: "VIEW THE OFFERING →" };
  }
  return null;
}

export function isPubliclyListed(listing: {
  status: string;
  public_slug: string | null;
  public_category: string | null;
  zillow_url: string | null;
}): boolean {
  if (listing.status === "archived") return false;
  if (listing.public_slug) return true;
  const category = parsePublicCategory(listing.public_category);
  return Boolean(category && category !== "coliving" && listing.zillow_url);
}
