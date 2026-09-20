import type { Listing, ListingPhotoSource, PadsplitPhoto } from "@/types/database";

/**
 * Exterior filter for PadSplit listing photos.
 *
 * Drop a photo when it is labeled exterior OR appears to be one:
 * category + any tags, plus alt/title/filename keywords (exterior, outside,
 * front, facade, curb) and the prior street/yard/porch/roof/driveway/back
 * set. Public OM, listing covers, and padsplit_photo_urls prefer interiors
 * only. Keep this regex in sync with scripts/scrape-padsplit.mjs.
 */
export const EXTERIOR_PHOTO_RE =
  /exterior|outside|front|facade|façade|curb|back|yard|street|driveway|porch|roof/i;

function photoFilename(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() ?? url);
  } catch {
    return url;
  }
}

export function padsplitPhotoHaystack(photo: PadsplitPhoto): string {
  const tags = Array.isArray(photo.tags) ? photo.tags.join(" ") : "";
  return [photo.category, photo.alt, photo.title, tags, photoFilename(photo.url)].filter(Boolean).join(" ");
}

export function isExteriorPadsplitPhoto(photo: PadsplitPhoto): boolean {
  return EXTERIOR_PHOTO_RE.test(padsplitPhotoHaystack(photo));
}

export type ListingPhotoFields = Pick<
  Listing,
  "photo_paths" | "photo_source" | "hero_photo_url" | "padsplit_gallery" | "padsplit_photos" | "padsplit_photo_urls" | "excluded_photo_urls"
>;

// Pre-migration rows (and any unexpected value) keep today's implicit
// behavior: PadSplit interiors if the scrape has any, otherwise uploads.
export function listingPhotoSource(listing: Partial<Pick<Listing, "photo_source" | "padsplit_photos" | "excluded_photo_urls">>): ListingPhotoSource {
  if (listing.photo_source === "padsplit" || listing.photo_source === "manual") return listing.photo_source;
  return interiorPhotos(listing).length > 0 ? "padsplit" : "manual";
}

export function interiorPhotos(listing: Pick<Listing, "padsplit_photos" | "excluded_photo_urls"> | Partial<Pick<Listing, "padsplit_photos" | "excluded_photo_urls">>): PadsplitPhoto[] {
  const excluded = new Set(listing.excluded_photo_urls ?? []);
  return (listing.padsplit_photos ?? []).filter((p) => !excluded.has(p.url)).filter((p) => !isExteriorPadsplitPhoto(p));
}

// Latest scrape interiors, including currently-excluded ones. Pull copies
// this into padsplit_gallery; exclude stays an overlay so a re-pull does
// not resurrect a photo she already hid.
export function importablePadsplitPhotos(listing: Partial<Pick<Listing, "padsplit_photos">>): PadsplitPhoto[] {
  return (listing.padsplit_photos ?? []).filter((p) => !isExteriorPadsplitPhoto(p));
}

export function hasCuratedPadsplitGallery(listing: { padsplit_gallery?: PadsplitPhoto[] | null }): boolean {
  return Array.isArray(listing.padsplit_gallery) && listing.padsplit_gallery.length > 0;
}

function rawPadsplitGallery(listing: Partial<Pick<Listing, "padsplit_gallery" | "padsplit_photos" | "padsplit_photo_urls">>): PadsplitPhoto[] {
  if (hasCuratedPadsplitGallery(listing)) return listing.padsplit_gallery ?? [];
  if (Array.isArray(listing.padsplit_photos) && listing.padsplit_photos.length > 0) return listing.padsplit_photos;
  return (listing.padsplit_photo_urls ?? []).map((url) => ({ url, category: null }));
}

export function visiblePadsplitPhotos(
  listing: Partial<Pick<Listing, "padsplit_gallery" | "padsplit_photos" | "padsplit_photo_urls" | "excluded_photo_urls">>,
): PadsplitPhoto[] {
  const excluded = new Set(listing.excluded_photo_urls ?? []);
  return rawPadsplitGallery(listing).filter((p) => !excluded.has(p.url)).filter((p) => !isExteriorPadsplitPhoto(p));
}

export function listingPublicPhotos(
  listing: Partial<ListingPhotoFields>,
  photoUrls: string[] = [],
): PadsplitPhoto[] {
  if (listingPhotoSource(listing) === "manual") {
    return photoUrls.map((url) => ({ url, category: null }));
  }
  return visiblePadsplitPhotos(listing);
}

function pinnedInSet(hero: string | null | undefined, urls: string[], paths: string[] = []): boolean {
  if (!hero) return false;
  return urls.includes(hero) || paths.includes(hero);
}

export function listingCoverPhotoUrl(
  listing: Partial<ListingPhotoFields>,
  photoUrls: string[] = [],
): string | null {
  const photos = listingPublicPhotos(listing, photoUrls);
  const urls = photos.map((p) => p.url);
  const hero = listing.hero_photo_url ?? null;
  if (listingPhotoSource(listing) === "manual") {
    const pinnedIndex = photoUrls.findIndex((url, i) => url === hero || listing.photo_paths?.[i] === hero);
    if (pinnedIndex >= 0) return photoUrls[pinnedIndex];
    return photoUrls[0] ?? null;
  }
  if (pinnedInSet(hero, urls)) return hero;
  return urls[0] ?? null;
}
