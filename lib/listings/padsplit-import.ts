import type { PadsplitPhoto } from "@/types/database";
import { hasCuratedPadsplitGallery, importablePadsplitPhotos } from "@/lib/listings/padsplit-photos";
import { parsePadsplitListingHtml, type PadsplitListingContext, type PadsplitSnapshot } from "@/lib/listings/padsplit-parse";

export const PADSPLIT_FETCH_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export type PadsplitGalleryListing = PadsplitListingContext & {
  photo_paths?: string[] | null;
  photo_source?: string | null;
  padsplit_gallery?: PadsplitPhoto[] | null;
  padsplit_photos?: PadsplitPhoto[] | null;
  hero_photo_url?: string | null;
};

// Copy scrape interiors into the curated gallery once. Daily occupancy
// refresh must not call this when a gallery is already saved — that order
// and the hero pin are hers. `force` is only for a new PadSplit ID, which
// replaces the previous house's snapshot.
export function padsplitGalleryOneShotPatch(
  listing: PadsplitGalleryListing,
  options: { force?: boolean } = {},
): Record<string, unknown> | null {
  if (!options.force && hasCuratedPadsplitGallery(listing)) return null;
  const interiors = importablePadsplitPhotos(listing);
  if (interiors.length === 0) return null;
  const patch: Record<string, unknown> = { padsplit_gallery: interiors };
  const uploads = listing.photo_paths ?? [];
  if (listing.photo_source !== "padsplit" && uploads.length === 0) patch.photo_source = "padsplit";
  const hero = listing.hero_photo_url ?? null;
  if (hero && !interiors.some((photo) => photo.url === hero)) patch.hero_photo_url = null;
  return patch;
}

export function padsplitLiveImportPatch(
  snapshot: PadsplitSnapshot,
  listing: PadsplitGalleryListing,
  options: { replaceGallery: boolean; scrapedAt: string },
): Record<string, unknown> {
  const galleryPatch = padsplitGalleryOneShotPatch(
    { ...listing, padsplit_photos: snapshot.photos },
    { force: options.replaceGallery },
  );
  return {
    occupied_rooms: snapshot.occupiedRooms,
    total_rooms: snapshot.totalRooms,
    price_low: snapshot.priceLow,
    price_high: snapshot.priceHigh,
    padsplit_photo_urls: snapshot.interiorUrls,
    padsplit_photos: snapshot.photos,
    last_scraped_at: options.scrapedAt,
    last_scrape_error: null,
    ...galleryPatch,
  };
}

export async function fetchPadsplitSnapshot(url: string, listing: PadsplitListingContext = {}): Promise<{ ok: true; snapshot: PadsplitSnapshot } | { ok: false; error: string }> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": PADSPLIT_FETCH_UA, Accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) return { ok: false, error: `PadSplit blocked or errored (status ${response.status})` };
    return parsePadsplitListingHtml(await response.text(), listing);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "PadSplit request failed" };
  }
}
