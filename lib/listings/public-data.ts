import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Listing, PadsplitPhoto } from "@/types/database";
import { interiorPhotos, listingCoverPhotoUrl } from "@/lib/listings/padsplit-photos";

export { interiorPhotos, listingCoverPhotoUrl } from "@/lib/listings/padsplit-photos";

const OWNER_ID = process.env.CRM_OWNER_USER_ID;

export type OccupancyTrendPoint = { label: string; pct: number; occupied: number | null; total: number | null };

// Last 12 calendar months, one point each, from the daily snapshots the
// scraper writes. A month with no snapshot (no history yet, or the
// listing's PadSplit URL was only added recently) renders as 0% rather
// than being skipped, so the chart always has exactly 12 bars.
async function getOccupancyTrend(admin: SupabaseClient, listingId: string): Promise<OccupancyTrendPoint[]> {
  const since = new Date();
  since.setUTCDate(1);
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCMonth(since.getUTCMonth() - 11);

  const { data } = await admin
    .from("listing_occupancy_snapshots")
    .select("occupied_rooms, total_rooms, captured_at")
    .eq("listing_id", listingId)
    .gte("captured_at", since.toISOString())
    .order("captured_at", { ascending: true });

  const byMonth = new Map<string, { occupied: number | null; total: number | null }>();
  for (const row of data ?? []) {
    const d = new Date(row.captured_at);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    // Ascending order - the last write for a given month wins, so this
    // ends up holding that month's most recent reading.
    byMonth.set(key, { occupied: row.occupied_rooms, total: row.total_rooms });
  }

  const points: OccupancyTrendPoint[] = [];
  const cursor = new Date(since);
  for (let i = 0; i < 12; i++) {
    const key = `${cursor.getUTCFullYear()}-${cursor.getUTCMonth()}`;
    const entry = byMonth.get(key);
    const pct = entry && entry.total ? Math.round(((entry.occupied ?? 0) / entry.total) * 100) : 0;
    points.push({
      label: cursor.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
      pct,
      occupied: entry?.occupied ?? null,
      total: entry?.total ?? null,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return points;
}

export type PublicListing = Listing & { photoUrls: string[]; photos: PadsplitPhoto[]; occupancyTrend: OccupancyTrendPoint[] };

// Public, unauthenticated reads - same idiom as app/n/[slug]/actions.ts and
// app/book/[slug]/booking-actions.ts: scoped to the single owner account
// via the admin client rather than a signed-in session, since a visitor
// has none. Only listings with a public_slug set (the toggle in the
// marketing tab) and not yet closed are ever reachable this way.
export async function getPublicListing(slug: string): Promise<PublicListing | null> {
  if (!OWNER_ID) return null;
  const admin = createAdminClient();
  const { data: listing } = await admin
    .from("listings")
    .select("*")
    .eq("owner_id", OWNER_ID)
    .eq("public_slug", slug)
    .neq("status", "closed")
    .maybeSingle();
  if (!listing) return null;

  const photoUrls = (listing.photo_paths as string[]).map((p) => admin.storage.from("listing-photos").getPublicUrl(p).data.publicUrl);
  // Interior PadSplit photos first (fresher, scraped daily); if the scrape
  // has nothing yet, fall back to the manually uploaded set - she chose
  // those for marketing already, so no exterior filter is needed on them.
  const scraped = interiorPhotos(listing);
  const photos = scraped.length > 0 ? scraped : photoUrls.map((url) => ({ url, category: null }));
  const occupancyTrend = await getOccupancyTrend(admin, listing.id);

  return { ...listing, photoUrls, photos, occupancyTrend };
}

export type PublicListingCard = Listing & { photoUrls: string[]; coverPhotoUrl: string | null };

export async function getPublicListings(): Promise<PublicListingCard[]> {
  if (!OWNER_ID) return [];
  const admin = createAdminClient();
  const { data: listings } = await admin
    .from("listings")
    .select("*")
    .eq("owner_id", OWNER_ID)
    .not("public_slug", "is", null)
    .neq("status", "closed")
    .order("created_at", { ascending: false });

  return (listings ?? []).map((listing) => {
    const photoUrls = (listing.photo_paths as string[]).map((p) => admin.storage.from("listing-photos").getPublicUrl(p).data.publicUrl);
    return {
      ...listing,
      photoUrls,
      coverPhotoUrl: listingCoverPhotoUrl(listing, photoUrls),
    };
  });
}
