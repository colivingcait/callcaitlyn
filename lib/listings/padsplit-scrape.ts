import type { SupabaseClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
import type { Listing } from "@/types/database";

// Scrapes a PadSplit listing page for occupancy/pricing/photos, once a day,
// so a public listing page stays accurate without her updating it by hand.
// PadSplit's actual page shape has never been confirmed against a real
// fetch (this dev sandbox's network egress is blocked to padsplit.com) -
// field guesses below are best-effort, same spirit as lib/quo/parse-event.ts's
// "unconfirmed against real payload" comments. If a scrape keeps failing,
// check `last_scrape_error` in the listing's marketing tab and adjust the
// parsing here from what the raw HTML actually contains.
//
// Strategy, in order: (1) most React/Next.js-style sites embed the page's
// full data as JSON in a script tag (commonly `__NEXT_DATA__`) - if present,
// that's far more reliable than scraping rendered text; (2) fall back to
// meta tags + visible-text regexes via cheerio; (3) if neither finds
// anything, the page is likely fully client-rendered and this approach
// can't work at all - that failure is surfaced, not swallowed.
export type PadsplitScrapeResult = {
  occupiedRooms: number | null;
  totalRooms: number | null;
  priceLow: number | null;
  priceHigh: number | null;
  photoUrls: string[];
};

function tryEmbeddedJson(html: string): Record<string, unknown> | null {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

// Walks an unknown-shaped object looking for the first value at any depth
// matching a key name, so a plausible field is found regardless of exactly
// how deep PadSplit nests its page props - a narrower fixed path would be
// one guess away from breaking on the first real payload.
function findFirstByKey(obj: unknown, keys: string[], seen = new Set<unknown>()): unknown {
  if (!obj || typeof obj !== "object" || seen.has(obj)) return undefined;
  seen.add(obj);
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (keys.includes(key) && value != null) return value;
  }
  for (const value of Object.values(obj as Record<string, unknown>)) {
    if (value && typeof value === "object") {
      const found = findFirstByKey(value, keys, seen);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

function fromEmbeddedJson(data: Record<string, unknown>): Partial<PadsplitScrapeResult> {
  const occupied = findFirstByKey(data, ["occupiedRooms", "occupied_rooms", "roomsOccupied"]);
  const total = findFirstByKey(data, ["totalRooms", "total_rooms", "roomCount", "numberOfRooms"]);
  const priceLow = findFirstByKey(data, ["priceLow", "price_low", "minPrice", "lowestPrice"]);
  const priceHigh = findFirstByKey(data, ["priceHigh", "price_high", "maxPrice", "highestPrice"]);
  const images = findFirstByKey(data, ["images", "photos", "photoUrls", "imageUrls"]);

  const photoUrls: string[] = Array.isArray(images)
    ? images
        .map((img) => (typeof img === "string" ? img : typeof img === "object" && img && "url" in img ? (img as { url?: unknown }).url : null))
        .filter((u): u is string => typeof u === "string")
    : [];

  return {
    occupiedRooms: typeof occupied === "number" ? occupied : null,
    totalRooms: typeof total === "number" ? total : null,
    priceLow: typeof priceLow === "number" ? priceLow : null,
    priceHigh: typeof priceHigh === "number" ? priceHigh : null,
    photoUrls,
  };
}

function fromHtmlFallback(html: string): Partial<PadsplitScrapeResult> {
  const $ = cheerio.load(html);
  const text = $("body").text();

  const occupancyMatch = text.match(/(\d+)\s*(?:of|\/)\s*(\d+)\s*rooms?\s*occupied/i);
  const priceRangeMatch = text.match(/\$([\d,]+)\s*(?:-|to)\s*\$([\d,]+)/);
  const singlePriceMatch = !priceRangeMatch ? text.match(/\$([\d,]+)\s*\/\s*(?:week|wk|month|mo)\b/i) : null;

  const photoUrls = $('meta[property="og:image"]')
    .map((_, el) => $(el).attr("content"))
    .get()
    .filter((u): u is string => typeof u === "string" && u.length > 0);

  return {
    occupiedRooms: occupancyMatch ? Number(occupancyMatch[1]) : null,
    totalRooms: occupancyMatch ? Number(occupancyMatch[2]) : null,
    priceLow: priceRangeMatch ? Number(priceRangeMatch[1].replace(/,/g, "")) : singlePriceMatch ? Number(singlePriceMatch[1].replace(/,/g, "")) : null,
    priceHigh: priceRangeMatch ? Number(priceRangeMatch[2].replace(/,/g, "")) : singlePriceMatch ? Number(singlePriceMatch[1].replace(/,/g, "")) : null,
    photoUrls,
  };
}

export async function scrapePadsplitListing(url: string): Promise<PadsplitScrapeResult> {
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; CallCaitlynCRM/1.0)" },
  });
  if (!response.ok) throw new Error(`PadSplit returned ${response.status}`);

  const html = await response.text();
  const embedded = tryEmbeddedJson(html);
  const fromJson = embedded ? fromEmbeddedJson(embedded) : {};
  const fromHtml = fromHtmlFallback(html);

  const result: PadsplitScrapeResult = {
    occupiedRooms: fromJson.occupiedRooms ?? fromHtml.occupiedRooms ?? null,
    totalRooms: fromJson.totalRooms ?? fromHtml.totalRooms ?? null,
    priceLow: fromJson.priceLow ?? fromHtml.priceLow ?? null,
    priceHigh: fromJson.priceHigh ?? fromHtml.priceHigh ?? null,
    photoUrls: fromJson.photoUrls?.length ? fromJson.photoUrls : (fromHtml.photoUrls ?? []),
  };

  if (result.occupiedRooms == null && result.priceLow == null && result.photoUrls.length === 0) {
    throw new Error("Couldn't find occupancy, price, or photo data in the page - it may require a real browser to render.");
  }

  return result;
}

// Scrapes and saves one listing's PadSplit data, recording last_scrape_error
// on failure rather than throwing, so one bad listing never blocks the rest
// of the daily cron loop (or a "Scrape now" click for a different listing).
export async function scrapeAndSaveListing(admin: SupabaseClient, listing: Pick<Listing, "id" | "padsplit_url">): Promise<{ ok: boolean; error?: string }> {
  if (!listing.padsplit_url) return { ok: false, error: "No PadSplit URL set" };

  try {
    const result = await scrapePadsplitListing(listing.padsplit_url);
    await admin
      .from("listings")
      .update({
        occupied_rooms: result.occupiedRooms,
        total_rooms: result.totalRooms,
        price_low: result.priceLow,
        price_high: result.priceHigh,
        padsplit_photo_urls: result.photoUrls,
        last_scraped_at: new Date().toISOString(),
        last_scrape_error: null,
      })
      .eq("id", listing.id);
    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Scrape failed";
    await admin.from("listings").update({ last_scraped_at: new Date().toISOString(), last_scrape_error: error }).eq("id", listing.id);
    return { ok: false, error };
  }
}

export async function scrapeAllListings(admin: SupabaseClient, ownerId: string): Promise<{ scraped: number; failed: number }> {
  const { data: listings } = await admin.from("listings").select("id, padsplit_url").eq("owner_id", ownerId).not("padsplit_url", "is", null);

  let scraped = 0;
  let failed = 0;
  for (const listing of listings ?? []) {
    const result = await scrapeAndSaveListing(admin, listing);
    if (result.ok) scraped++;
    else failed++;
  }
  return { scraped, failed };
}
