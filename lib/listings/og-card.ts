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

// Photo-card right panel. Padding is inside the 500px panel (border-box),
// so the price and location share this content width.
export const OG_PHOTO_PANEL_WIDTH = 500;
export const OG_PHOTO_PAD_X = 48;
export const OG_TEXT_SAFE_INSET = 8;
export const OG_PRICE_MAX = 108;
export const OG_PRICE_MIN = 64;

export function ogPhotoContentWidth(): number {
  return OG_PHOTO_PANEL_WIDTH - OG_PHOTO_PAD_X * 2;
}

// Newsreader Regular, UPM 2000. Digits and "$" are tabular (1133). Measured
// from assets/fonts/Newsreader-Regular.ttf.
const NEWSREADER_UPM = 2000;
const NEWSREADER_DIGIT = 1133;
const NEWSREADER_ADVANCE: Record<string, number> = {
  $: 1133,
  ",": 477,
  "0": 1133,
  "1": 1133,
  "2": 1133,
  "3": 1133,
  "4": 1133,
  "5": 1133,
  "6": 1133,
  "7": 1133,
  "8": 1133,
  "9": 1133,
};

export function newsreaderTextWidth(text: string, fontSize: number): number {
  let units = 0;
  for (const ch of text) units += NEWSREADER_ADVANCE[ch] ?? NEWSREADER_DIGIT;
  return (units * fontSize) / NEWSREADER_UPM;
}

export function ogPriceFontSize(price: string, maxWidth = ogPhotoContentWidth()): number {
  const limit = Math.max(0, maxWidth - OG_TEXT_SAFE_INSET);
  let size = OG_PRICE_MAX;
  while (size > OG_PRICE_MIN && newsreaderTextWidth(price, size) > limit) size -= 1;
  return size;
}

// Archivo SemiBold, UPM 1000. Satori adds letter-spacing after every glyph,
// including the last. Unknown glyphs use "M" so a long line shrinks instead
// of clipping. Measured from assets/fonts/Archivo-SemiBold.ttf.
const ARCHIVO_UPM = 1000;
const ARCHIVO_FALLBACK = 844;
const ARCHIVO_ADVANCE: Record<string, number> = {
  " ": 200,
  $: 541,
  "&": 729,
  "'": 246,
  ",": 300,
  "-": 333,
  ".": 300,
  "/": 298,
  "0": 575,
  "1": 576,
  "2": 576,
  "3": 576,
  "4": 577,
  "5": 575,
  "6": 576,
  "7": 576,
  "8": 576,
  "9": 575,
  A: 709,
  B: 706,
  C: 721,
  D: 728,
  E: 672,
  F: 609,
  G: 794,
  H: 732,
  I: 282,
  J: 585,
  K: 695,
  L: 570,
  M: 844,
  N: 732,
  O: 782,
  P: 670,
  Q: 782,
  R: 717,
  S: 667,
  T: 619,
  U: 724,
  V: 671,
  W: 954,
  X: 686,
  Y: 677,
  Z: 634,
  "·": 333,
};

export function archivoSemiboldTextWidth(text: string, fontSize: number, letterSpacing: number): number {
  let units = 0;
  let count = 0;
  for (const ch of text) {
    units += ARCHIVO_ADVANCE[ch] ?? ARCHIVO_FALLBACK;
    count += 1;
  }
  return (units * fontSize) / ARCHIVO_UPM + letterSpacing * count;
}

const LOCATION_STEPS: Array<{ fontSize: number; letterSpacing: number }> = [
  { fontSize: 20, letterSpacing: 3.2 },
  { fontSize: 18, letterSpacing: 2.2 },
  { fontSize: 18, letterSpacing: 1.6 },
  { fontSize: 17, letterSpacing: 1.4 },
  { fontSize: 16, letterSpacing: 1.2 },
  { fontSize: 15, letterSpacing: 0.8 },
  { fontSize: 14, letterSpacing: 0.4 },
];

const METRO_SUFFIX = " · ATLANTA METRO";

function fitLocationStep(text: string, limit: number): { fontSize: number; letterSpacing: number } | null {
  for (const step of LOCATION_STEPS) {
    if (archivoSemiboldTextWidth(text, step.fontSize, step.letterSpacing) <= limit) return step;
  }
  return null;
}

function shrinkLocationStep(text: string, limit: number): { fontSize: number; letterSpacing: number } {
  let fontSize = 13;
  while (fontSize > 8 && archivoSemiboldTextWidth(text, fontSize, 0) > limit) fontSize -= 1;
  return { fontSize, letterSpacing: 0 };
}

// Display fit only. ogLocationLine still returns the full submarket line;
// this drops the metro suffix when that line cannot stay on one row.
export function fitOgLocationLine(
  line: string,
  maxWidth = ogPhotoContentWidth(),
): { text: string; fontSize: number; letterSpacing: number } {
  const limit = Math.max(0, maxWidth - OG_TEXT_SAFE_INSET);
  const full = fitLocationStep(line, limit);
  if (full) return { text: line, ...full };
  if (line.endsWith(METRO_SUFFIX)) {
    const place = line.slice(0, -METRO_SUFFIX.length).trim();
    if (place) {
      return { text: place, ...(fitLocationStep(place, limit) ?? shrinkLocationStep(place, limit)) };
    }
  }
  return { text: line, ...shrinkLocationStep(line, limit) };
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
