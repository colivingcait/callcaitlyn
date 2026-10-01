import { createHash } from "node:crypto";
import { publicListingCopy } from "@/lib/listings/public-copy";
import { isExteriorPadsplitPhoto } from "@/lib/listings/padsplit-photos";
import type { PadsplitPhoto } from "@/types/database";

// Public link-preview copy. Every category (coliving, for-sale, off-market)
// shows the submarket Caitlyn entered. "Atlanta metro" is only the fallback
// when that field is blank or is itself a street address. The street address
// is never an input to this module.

const HOUSE_NUMBER = /^\s*\d{1,6}[a-z]?(?:\s*[-–]\s*\d{1,6}[a-z]?)?\s+\S+/i;
const INLINE_STREET =
  /\b\d{1,6}[a-z]?\s+(?:[A-Za-z0-9.'#-]+\s+){0,5}(?:street|st|avenue|ave|boulevard|blvd|drive|dr|road|rd|lane|ln|way|court|ct|place|pl|terrace|ter|parkway|pkwy|circle|cir|highway|hwy|trail|trl)\b/i;

export type OgListingSource = {
  nickname: string | null;
  submarket: string | null;
  status: string;
  list_price: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  story: string | null;
  public_description: string | null;
  photos: PadsplitPhoto[];
};

export type OgListingCard = {
  title: string;
  description: string;
  locationLine: string;
  statusLabel: string;
  price: string | null;
  priceSize: number;
  specs: string | null;
  hook: string | null;
  heroUrl: string | null;
  version: string;
};

export function looksLikeStreetAddress(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (HOUSE_NUMBER.test(trimmed)) return true;
  return INLINE_STREET.test(trimmed);
}

export function ogPlaceName(submarket: string | null | undefined): string {
  const value = publicListingCopy(submarket);
  if (!value || looksLikeStreetAddress(value)) return "Atlanta metro";
  return value;
}

export function ogLocationLine(submarket: string | null | undefined): string {
  const place = ogPlaceName(submarket);
  if (/^(atlanta metro|metro atlanta|atlanta)$/i.test(place)) return "ATLANTA METRO";
  return `${place.toUpperCase()} · ATLANTA METRO`;
}

export function ogStatusLabel(status: string): string {
  if (status === "coming_soon") return "Coming soon";
  if (status === "under_contract") return "Under contract";
  return "For sale";
}

export function ogPrice(listPrice: number | null | undefined): string | null {
  if (listPrice == null || !Number.isFinite(listPrice)) return null;
  return `$${Math.round(listPrice).toLocaleString("en-US")}`;
}

export function ogPriceFontSize(price: string): number {
  if (price.length <= 8) return 108;
  if (price.length === 9) return 96;
  if (price.length === 10) return 86;
  return 72;
}

function formatCount(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 10) / 10);
}

export function ogSpecs(listing: { beds: number | null; baths: number | null; sqft: number | null }): string | null {
  const parts = [
    listing.beds != null ? `${formatCount(listing.beds)} bd` : null,
    listing.baths != null ? `${formatCount(listing.baths)} ba` : null,
    listing.sqft != null && listing.sqft > 0 ? `${Math.round(listing.sqft).toLocaleString("en-US")} sqft` : null,
  ].filter((part): part is string => Boolean(part));
  return parts.length ? parts.join(" · ") : null;
}

function clipLine(value: string, max: number): string {
  const flat = value.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = (lastSpace > 24 ? cut.slice(0, lastSpace) : cut).trim();
  return `${base}…`;
}

export function ogHook(story: string | null | undefined, description: string | null | undefined): string | null {
  const raw = publicListingCopy(story) || publicListingCopy(description);
  if (!raw) return null;
  const sentence = raw.split(/\n|(?<=[.!?])\s+/)[0]?.trim() ?? raw;
  if (!sentence || looksLikeStreetAddress(sentence)) return null;
  return clipLine(sentence, 52);
}

export function ogShareTitle(listing: { nickname: string | null; submarket: string | null }): string {
  const name = publicListingCopy(listing.nickname);
  const headline = name && !looksLikeStreetAddress(name) ? name : ogPlaceName(listing.submarket);
  return `${headline} | Caitlyn Verdugo, KW Metro Atlanta`;
}

export function ogShareDescription(listing: OgListingSource): string {
  const parts = [ogPrice(listing.list_price), ogPlaceName(listing.submarket), ogSpecs(listing), ogHook(listing.story, listing.public_description)].filter(
    (part): part is string => Boolean(part),
  );
  return parts.join(" · ") || "Caitlyn Verdugo, Keller Williams Metro Atlanta";
}

// First interior in the saved gallery order. Kitchen is an interior, not a
// separate priority — a bathroom saved ahead of the kitchen stays first.
// Exterior labels and exterior filenames never qualify.
export function ogHeroPhoto(photos: PadsplitPhoto[] | null | undefined): PadsplitPhoto | null {
  for (const photo of photos ?? []) {
    if (!photo?.url) continue;
    if (isExteriorPadsplitPhoto(photo)) continue;
    return photo;
  }
  return null;
}

export function ogVersionToken(input: { listPrice: number | null; status: string; heroUrl: string | null }): string {
  const payload = `${input.listPrice ?? ""}|${input.status}|${input.heroUrl ?? ""}`;
  return createHash("sha256").update(payload).digest("hex").slice(0, 12);
}

export function buildOgListingCard(listing: OgListingSource): OgListingCard {
  const heroUrl = ogHeroPhoto(listing.photos)?.url ?? null;
  const price = ogPrice(listing.list_price);
  return {
    title: ogShareTitle(listing),
    description: ogShareDescription(listing),
    locationLine: ogLocationLine(listing.submarket),
    statusLabel: ogStatusLabel(listing.status),
    price,
    priceSize: price ? ogPriceFontSize(price) : 108,
    specs: ogSpecs(listing),
    hook: ogHook(listing.story, listing.public_description),
    heroUrl,
    version: ogVersionToken({ listPrice: listing.list_price, status: listing.status, heroUrl }),
  };
}
