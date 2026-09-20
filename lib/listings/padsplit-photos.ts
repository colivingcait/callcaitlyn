import type { Listing, PadsplitPhoto } from "@/types/database";

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

export function interiorPhotos(listing: Pick<Listing, "padsplit_photos" | "excluded_photo_urls">): PadsplitPhoto[] {
  const excluded = new Set(listing.excluded_photo_urls ?? []);
  return (listing.padsplit_photos ?? []).filter((p) => !excluded.has(p.url)).filter((p) => !isExteriorPadsplitPhoto(p));
}

export function listingCoverPhotoUrl(
  listing: Pick<Listing, "padsplit_photos" | "excluded_photo_urls" | "padsplit_photo_urls">,
  photoUrls: string[] = [],
): string | null {
  const interior = interiorPhotos(listing)[0]?.url;
  if (interior) return interior;
  const fromUrlList = (listing.padsplit_photo_urls ?? []).find((url) => !isExteriorPadsplitPhoto({ url, category: null }));
  return fromUrlList ?? photoUrls[0] ?? null;
}
