import type { PadsplitPhoto } from "@/types/database";
import { isExteriorPadsplitPhoto } from "@/lib/listings/padsplit-photos";
import { occupancyRoomsOverride, parseRoomCount } from "@/lib/listings/occupancy";

// Shape shared with scripts/scrape-padsplit.mjs. The GitHub Action cron
// still uses Playwright because PadSplit has challenged Vercel IPs before.
// Saving a PadSplit ID uses this parser on the listing HTML `__NEXT_DATA__`
// so the first import does not wait for the next morning/night run.

const CHALLENGE = /just a moment|verify you are human|captcha|access denied|attention required/i;
const PHOTO_CAP = 24;

export type PadsplitListingContext = {
  beds?: number | null;
  financials?: unknown;
};

export type PadsplitSnapshot = {
  totalRooms: number | null;
  occupiedRooms: number | null;
  priceLow: number | null;
  priceHigh: number | null;
  photos: PadsplitPhoto[];
  interiorUrls: string[];
};

export type PadsplitParseResult = { ok: true; snapshot: PadsplitSnapshot } | { ok: false; error: string };

function stringField(node: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = node[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

export function findPadsplitProperty(node: unknown, depth = 0, seen = new Set<unknown>()): Record<string, unknown> | null {
  if (!node || typeof node !== "object" || depth > 16 || seen.has(node)) return null;
  seen.add(node);
  if (!Array.isArray(node) && "totalRoomsCount" in node && "isFullyBooked" in node) return node as Record<string, unknown>;
  const children = Array.isArray(node) ? node : Object.values(node);
  for (const child of children) {
    const found = findPadsplitProperty(child, depth + 1, seen);
    if (found) return found;
  }
  return null;
}

export function findPadsplitPhotos(node: unknown, depth = 0, seen = new Set<unknown>(), out: PadsplitPhoto[] = [], urlsSeen = new Set<string>()): PadsplitPhoto[] {
  if (!node || typeof node !== "object" || depth > 18 || seen.has(node)) return out;
  seen.add(node);
  if (Array.isArray(node)) {
    for (const child of node) findPadsplitPhotos(child, depth + 1, seen, out, urlsSeen);
    return out;
  }
  const record = node as Record<string, unknown>;
  if (typeof record.location === "string" && /^https?:\/\//.test(record.location) && "category" in record) {
    if (!urlsSeen.has(record.location)) {
      urlsSeen.add(record.location);
      const rawTags = Array.isArray(record.tags) ? record.tags : Array.isArray(record.labels) ? record.labels : null;
      const tags = rawTags?.filter((tag): tag is string => typeof tag === "string") ?? null;
      const photo: PadsplitPhoto = {
        url: record.location,
        category: typeof record.category === "string" ? record.category : null,
      };
      const alt = stringField(record, ["alt", "altText", "caption", "description"]);
      const title = stringField(record, ["title", "name"]);
      if (alt) photo.alt = alt;
      if (title) photo.title = title;
      if (tags && tags.length > 0) photo.tags = tags;
      out.push(photo);
    }
  }
  for (const value of Object.values(record)) findPadsplitPhotos(value, depth + 1, seen, out, urlsSeen);
  return out;
}

function finitePrice(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function snapshotFromPadsplitProperty(property: Record<string, unknown>, photos: PadsplitPhoto[], listing: PadsplitListingContext = {}): PadsplitSnapshot {
  const interiors = photos.filter((photo) => !isExteriorPadsplitPhoto(photo));
  const exteriors = photos.filter((photo) => isExteriorPadsplitPhoto(photo));
  const listedTotal = typeof property.totalRoomsCount === "number" ? property.totalRoomsCount : null;
  const houseBedrooms = parseRoomCount(property.bedrooms);
  const overrideTotal = occupancyRoomsOverride({ financials: listing.financials as never }) ?? parseRoomCount(listing.beds);
  const availableRooms = Array.isArray(property.rooms) ? property.rooms : [];
  const availableCount = property.isFullyBooked ? 0 : availableRooms.length;
  const totalRooms = overrideTotal ?? houseBedrooms ?? listedTotal;
  const occupiedRooms = totalRooms == null ? null : Math.max(totalRooms - availableCount, 0);

  const roomRates = availableRooms
    .map((room) => {
      if (!room || typeof room !== "object") return null;
      const record = room as Record<string, unknown>;
      return finitePrice(record.totalWeeklyRate) ?? finitePrice(record.weeklyRate) ?? finitePrice(record.basePrice) ?? finitePrice(record.price) ?? finitePrice(record.rate);
    })
    .filter((rate): rate is number => rate != null);
  const floorPrice = typeof property.roomMinPrice === "number" && property.roomMinPrice > 0 ? property.roomMinPrice : null;
  const priceLow = roomRates.length ? Math.min(...roomRates) : floorPrice;
  const priceHigh = roomRates.length ? Math.max(...roomRates) : floorPrice;

  return {
    totalRooms,
    occupiedRooms,
    priceLow,
    priceHigh,
    photos: [...interiors, ...exteriors].slice(0, PHOTO_CAP),
    interiorUrls: interiors.map((photo) => photo.url),
  };
}

export function parsePadsplitNextData(data: unknown, listing: PadsplitListingContext = {}): PadsplitParseResult {
  const property = findPadsplitProperty(data);
  if (!property) return { ok: false, error: "Page hydrated but no property data was found in it" };
  return { ok: true, snapshot: snapshotFromPadsplitProperty(property, findPadsplitPhotos(data), listing) };
}

export function parsePadsplitListingHtml(html: string, listing: PadsplitListingContext = {}): PadsplitParseResult {
  if (CHALLENGE.test(html)) return { ok: false, error: "PadSplit blocked or errored (challenge page)" };
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return { ok: false, error: "Listing page never rendered real data" };
  try {
    return parsePadsplitNextData(JSON.parse(match[1]), listing);
  } catch {
    return { ok: false, error: "Listing page never rendered real data" };
  }
}
