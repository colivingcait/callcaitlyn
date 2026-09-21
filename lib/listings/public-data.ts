import { createAdminClient } from "@/lib/supabase/admin";
import type { DealSide, Listing, PadsplitPhoto, PropertyType } from "@/types/database";
import { listingCoverPhotoUrl, listingPublicPhotos } from "@/lib/listings/padsplit-photos";
import { asListingFinancials } from "@/lib/listings/crm-marketing-fields";
import {
  listingLiveOccupancy,
  occupancyFromFinancials,
  occupancyTrendFromSidecar,
  type OccupancyTrendPoint,
} from "@/lib/listings/occupancy";
import { isPubliclyListed } from "@/lib/listings/public-category";
import { partitionPublicListings, sortPublicListings, toPublicIndexCard, type PublicIndexCard } from "@/lib/listings/public-index";
import { normalizeListingAddress, toPublicSoldEntry, type PublicSoldEntry } from "@/lib/listings/public-sold";

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
    .neq("status", "closed")
    .order("created_at", { ascending: false });

  const visible = (listings ?? []).filter((listing) => isPubliclyListed(listing));
  return sortPublicListings(
    visible.map((listing) => {
      const photoUrls = (listing.photo_paths as string[]).map((p) => admin.storage.from("listing-photos").getPublicUrl(p).data.publicUrl);
      return {
        ...withLiveOccupancy(listing),
        photoUrls,
        coverPhotoUrl: listingCoverPhotoUrl(listing, photoUrls),
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
    admin.from("listings").select("address, nickname").eq("owner_id", OWNER_ID).eq("status", "closed").not("nickname", "is", null),
  ]);

  const nicknamesByAddress = new Map<string, string>();
  for (const listing of closedListings ?? []) {
    if (!listing.address || !listing.nickname) continue;
    nicknamesByAddress.set(normalizeListingAddress(listing.address), listing.nickname);
  }

  const sold: PublicSoldEntry[] = [];
  for (const deal of deals ?? []) {
    const nickname = deal.address ? nicknamesByAddress.get(normalizeListingAddress(deal.address)) : undefined;
    const entry = toPublicSoldEntry(
      {
        id: deal.id,
        address: deal.address,
        property_type: deal.property_type as PropertyType | null,
        side: deal.side as DealSide | null,
        on_fmls: Boolean(deal.on_fmls),
        closed_at: deal.closed_at,
      },
      nickname,
    );
    if (!entry) continue;
    sold.push(entry);
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
