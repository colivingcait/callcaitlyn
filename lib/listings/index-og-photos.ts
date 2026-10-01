import { ogHeroPhoto } from "@/lib/listings/og-card";
import type { PadsplitPhoto } from "@/types/database";

// Two interiors for the listings-index card. Walk active listings newest
// first and take the first interior of each. An exterior (category, tags,
// alt, title, or filename) never qualifies. A listing with none is skipped.
// Missing slots stay null so the card can keep its beige placeholder.

export type IndexOgPhotoListing = {
  id: string;
  status: string;
  created_at: string;
  photos: PadsplitPhoto[];
};

export function selectIndexOgInteriorUrls(listings: IndexOgPhotoListing[]): [string | null, string | null] {
  const ranked = listings
    .filter((listing) => listing.status === "active")
    .sort((a, b) => {
      const byDate = b.created_at.localeCompare(a.created_at);
      if (byDate !== 0) return byDate;
      return a.id.localeCompare(b.id);
    });

  const found: string[] = [];
  for (const listing of ranked) {
    const photo = ogHeroPhoto(listing.photos);
    if (!photo?.url) continue;
    found.push(photo.url);
    if (found.length === 2) break;
  }
  return [found[0] ?? null, found[1] ?? null];
}
