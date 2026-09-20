import { createAdminClient } from "@/lib/supabase/admin";
import type { Listing, PadsplitPhoto } from "@/types/database";
import { listingCoverPhotoUrl, listingPublicPhotos } from "@/lib/listings/padsplit-photos";
import { asListingFinancials } from "@/lib/listings/crm-marketing-fields";
import {
  listingLiveOccupancy,
  occupancyFromFinancials,
  occupancyTrendFromSidecar,
  type OccupancyTrendPoint,
} from "@/lib/listings/occupancy";

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
    .neq("status", "closed")
    .maybeSingle();
  if (!listing) return null;

  const photoUrls = (listing.photo_paths as string[]).map((p) => admin.storage.from("listing-photos").getPublicUrl(p).data.publicUrl);
  const photos = listingPublicPhotos(listing, photoUrls);
  const occupancy = occupancyFromFinancials(asListingFinancials(listing.financials));
  const occupancyTrend = occupancyTrendFromSidecar(occupancy);

  return {
    ...withLiveOccupancy(listing),
    photoUrls,
    photos,
    coverPhotoUrl: listingCoverPhotoUrl(listing, photoUrls),
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
    .not("public_slug", "is", null)
    .neq("status", "closed")
    .order("created_at", { ascending: false });

  return (listings ?? []).map((listing) => {
    const photoUrls = (listing.photo_paths as string[]).map((p) => admin.storage.from("listing-photos").getPublicUrl(p).data.publicUrl);
    return {
      ...withLiveOccupancy(listing),
      photoUrls,
      coverPhotoUrl: listingCoverPhotoUrl(listing, photoUrls),
    };
  });
}
