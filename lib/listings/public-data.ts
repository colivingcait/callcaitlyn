import { createAdminClient } from "@/lib/supabase/admin";
import type { DealSide, Listing, PadsplitPhoto, PropertyType } from "@/types/database";
import { listingCoverPhotoUrl, listingPublicPhotos } from "@/lib/listings/padsplit-photos";
import { publicGalleryPhotos, publicInteriorCoverUrl, publicListingPrivacy } from "@/lib/listings/public-privacy";
import { asListingFinancials } from "@/lib/listings/crm-marketing-fields";
import {
  listingLiveOccupancy,
  occupancyFromFinancials,
  occupancyTrendFromSidecar,
  type OccupancyTrendPoint,
} from "@/lib/listings/occupancy";
import { isPubliclyListed } from "@/lib/listings/public-category";
import { selectIndexOgInteriorUrls } from "@/lib/listings/index-og-photos";
import { partitionPublicListings, sortPublicListings, toPublicIndexCard, type PublicIndexCard } from "@/lib/listings/public-index";
import { normalizeListingAddress, toPublicSoldEntry, type PublicSoldEntry, type PublicSoldListingMatch } from "@/lib/listings/public-sold";

export { interiorPhotos, listingCoverPhotoUrl, listingPublicPhotos } from "@/lib/listings/padsplit-photos";
export type { OccupancyTrendPoint } from "@/lib/listings/occupancy";

const OWNER_ID = process.env.CRM_OWNER_USER_ID;

export type PublicListing = Listing & {
  photoUrls: string[];
  photos: PadsplitPhoto[];
  coverPhotoUrl: string | null;
  occupancyTrend: OccupancyTrendPoint[];
  liveOccupied: number | null;
  liveTotal: number | null;
};

function withLiveOccupancy<T extends Listing>(listing: T): T & { liveOccupied: number | null; liveTotal: number | null } {
  const live = listingLiveOccupancy(listing);
  return { ...listing, liveOccupied: live.occupied, liveTotal: live.total };
}

export async function getPublicListing(slug: string): Promise<PublicListing | null> {
  if (!OWNER_ID) return null;
  const admin = createAdminClient();
  const { data: listing } = await admin
    .from("listings")
    .select("*")
    .eq("owner_id", OWNER_ID)
    .eq("public_slug", slug)
    .neq("status", "archived")
    .maybeSingle();
  if (!listing) return null;

  const photoUrls = (listing.photo_paths as string[]).map((p) => admin.storage.from("listing-photos").getPublicUrl(p).data.publicUrl);
  const privacy = publicListingPrivacy(listing);
  const photos = publicGalleryPhotos(listingPublicPhotos(listing, photoUrls), privacy);
  const occupancy = occupancyFromFinancials(asListingFinancials(listing.financials));
  const occupancyTrend = occupancyTrendFromSidecar(occupancy);
  const coverPhotoUrl = privacy.showExteriors ? listingCoverPhotoUrl(listing, photoUrls) : publicInteriorCoverUrl(photos);
  // PRIVATE pages must not carry street, zip, or a Zillow URL into the RSC tree.
  const redacted = privacy.showAddress
    ? listing
    : { ...listing, address: "", city: null, state: null, zip: null, zillow_url: null };

  return {
    ...withLiveOccupancy(redacted),
    photoUrls: privacy.showExteriors ? photoUrls : photos.map((photo) => photo.url),
    photos,
    coverPhotoUrl,
    occupancyTrend,
  };
}

export type PublicListingCard = Listing & { photoUrls: string[]; coverPhotoUrl: string | null; liveOccupied: number | null; liveTotal: number | null };

export async function getPublicListings(): Promise<PublicListingCard[]> {
  if (!OWNER_ID) return [];
  const admin = createAdminClient();
  const { data: listings } = await admin
    .from("listings")
    .select("*")
    .eq("owner_id", OWNER_ID)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  // Board visibility is status-only (coming soon / active / under contract).
  // public_slug publishes the dedicated OM; it is not an index opt-in.
  const visible = (listings ?? []).filter((listing) => isPubliclyListed(listing));
  return sortPublicListings(
    visible.map((listing) => {
      const photoUrls = (listing.photo_paths as string[]).map((p) => admin.storage.from("listing-photos").getPublicUrl(p).data.publicUrl);
      const privacy = publicListingPrivacy(listing);
      const photos = publicGalleryPhotos(listingPublicPhotos(listing, photoUrls), privacy);
      const coverPhotoUrl = privacy.showExteriors ? listingCoverPhotoUrl(listing, photoUrls) : publicInteriorCoverUrl(photos);
      const redacted = privacy.showAddress
        ? listing
        : { ...listing, address: "", city: null, state: null, zip: null, zillow_url: null };
      return {
        ...withLiveOccupancy(redacted),
        photoUrls: privacy.showExteriors ? photoUrls : photos.map((photo) => photo.url),
        coverPhotoUrl,
      };
    }),
  );
}

const INDEX_OG_PHOTO_COLUMNS =
  "id, status, created_at, photo_paths, photo_source, padsplit_gallery, padsplit_photos, padsplit_photo_urls, excluded_photo_urls";

// Server-only photo URLs for the index card. The image route fetches the
// bytes and embeds them; these URLs are not drawn on the card.
export async function getIndexOgInteriorPhotoUrls(): Promise<[string | null, string | null]> {
  if (!OWNER_ID) return [null, null];
  const admin = createAdminClient();
  const { data: listings } = await admin
    .from("listings")
    .select(INDEX_OG_PHOTO_COLUMNS)
    .eq("owner_id", OWNER_ID)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  return selectIndexOgInteriorUrls(
    (listings ?? []).map((listing) => {
      const paths = Array.isArray(listing.photo_paths) ? listing.photo_paths : [];
      const photoUrls = paths.map((path) => admin.storage.from("listing-photos").getPublicUrl(path).data.publicUrl);
      return {
        id: listing.id,
        status: listing.status,
        created_at: listing.created_at,
        photos: listingPublicPhotos(listing, photoUrls),
      };
    }),
  );
}

export async function getRecentlySoldPublic(): Promise<PublicSoldEntry[]> {
  if (!OWNER_ID) return [];
  const admin = createAdminClient();
  const [{ data: deals }, { data: closedListings }] = await Promise.all([
    admin
      .from("deals")
      .select("id, address, property_type, side, on_fmls, closed_at")
      .eq("owner_id", OWNER_ID)
      .eq("status", "won")
      .order("closed_at", { ascending: false })
      .limit(12),
    admin.from("listings").select("address, nickname, submarket, public_category").eq("owner_id", OWNER_ID).eq("status", "archived"),
  ]);

  const matchesByAddress = new Map<string, PublicSoldListingMatch>();
  for (const listing of closedListings ?? []) {
    if (!listing.address) continue;
    matchesByAddress.set(normalizeListingAddress(listing.address), {
      nickname: listing.nickname,
      submarket: listing.submarket,
      public_category: listing.public_category,
    });
  }

  const sold: PublicSoldEntry[] = [];
  for (const deal of deals ?? []) {
    const matched = deal.address ? matchesByAddress.get(normalizeListingAddress(deal.address)) : undefined;
    sold.push(
      toPublicSoldEntry(
        {
          id: deal.id,
          property_type: deal.property_type as PropertyType | null,
          side: deal.side as DealSide | null,
          on_fmls: Boolean(deal.on_fmls),
          closed_at: deal.closed_at,
        },
        matched,
      ),
    );
    if (sold.length === 4) break;
  }
  return sold;
}

export async function getPublicListingsIndex(): Promise<{
  available: PublicIndexCard[];
  underContract: PublicIndexCard[];
  sold: PublicSoldEntry[];
}> {
  const [listings, sold] = await Promise.all([getPublicListings(), getRecentlySoldPublic()]);
  const { available, underContract } = partitionPublicListings(listings);
  return {
    available: available.map(toPublicIndexCard),
    underContract: underContract.map(toPublicIndexCard),
    sold,
  };
}
