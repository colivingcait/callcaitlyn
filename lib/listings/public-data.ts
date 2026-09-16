import { createAdminClient } from "@/lib/supabase/admin";
import type { Listing } from "@/types/database";

const OWNER_ID = process.env.CRM_OWNER_USER_ID;

// Public, unauthenticated reads - same idiom as app/n/[slug]/actions.ts and
// app/book/[slug]/booking-actions.ts: scoped to the single owner account
// via the admin client rather than a signed-in session, since a visitor
// has none. Only listings with a public_slug set (the toggle in the
// marketing tab) and not yet closed are ever reachable this way.
export async function getPublicListing(slug: string): Promise<(Listing & { photoUrls: string[] }) | null> {
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
  return { ...listing, photoUrls };
}

export async function getPublicListings(): Promise<(Listing & { photoUrls: string[] })[]> {
  if (!OWNER_ID) return [];
  const admin = createAdminClient();
  const { data: listings } = await admin
    .from("listings")
    .select("*")
    .eq("owner_id", OWNER_ID)
    .not("public_slug", "is", null)
    .neq("status", "closed")
    .order("created_at", { ascending: false });

  return (listings ?? []).map((listing) => ({
    ...listing,
    photoUrls: (listing.photo_paths as string[]).map((p) => admin.storage.from("listing-photos").getPublicUrl(p).data.publicUrl),
  }));
}
