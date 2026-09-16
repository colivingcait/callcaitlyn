import Link from "next/link";
import { getPublicListings } from "@/lib/listings/public-data";
import { formatCurrency } from "@/lib/utils";

// Occupancy/pricing refresh daily and listings get published/unpublished
// on demand - this must never be served from a stale build-time cache.
export const dynamic = "force-dynamic";

export default async function PublicListingsOverviewPage() {
  const listings = await getPublicListings();

  return (
    <main className="min-h-dvh bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-3xl font-semibold text-neutral-900">Available listings</h1>
        <p className="mt-1 text-[15px] text-neutral-500">Caitlyn Verdugo with KW Metro Atl</p>

        {listings.length === 0 ? (
          <p className="mt-8 text-center text-sm text-neutral-400">No listings available right now.</p>
        ) : (
          <div className="mt-6 space-y-3">
            {listings.map((listing) => {
              const cover = listing.padsplit_photo_urls?.[0] ?? listing.photoUrls[0] ?? null;
              const specs = [
                listing.beds != null && listing.baths != null ? `${listing.beds} bd / ${listing.baths} ba` : null,
                listing.property_type,
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <Link
                  key={listing.id}
                  href={`/listing/${listing.public_slug}`}
                  className="flex items-center gap-3.5 rounded-2xl border border-neutral-200 bg-white p-3"
                >
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                    {cover && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-neutral-900">{listing.address}</p>
                    <p className="mt-0.5 text-sm text-neutral-500">
                      {formatCurrency(listing.list_price)}
                      {specs ? ` · ${specs}` : ""}
                    </p>
                    {listing.occupied_rooms != null && listing.total_rooms != null && (
                      <p className="mt-0.5 text-sm text-neutral-500">
                        {listing.occupied_rooms}/{listing.total_rooms} rooms occupied
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
