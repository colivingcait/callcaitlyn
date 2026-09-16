import type { Metadata } from "next";
import { getPublicListing } from "@/lib/listings/public-data";
import { PublicListingLeadForm } from "@/components/listings/PublicListingLeadForm";
import { formatCurrency } from "@/lib/utils";

// Occupancy/pricing refresh daily and a listing can be unpublished at any
// time - this must never be served from a stale build-time cache.
export const dynamic = "force-dynamic";

// Async, not a static `export const metadata`, since the title/description
// are per-listing - mirrors app/book/[slug]/page.tsx's pattern but with a
// real data fetch instead of static copy. A missing/removed slug still
// resolves to something reasonable rather than breaking the share preview.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getPublicListing(slug);
  if (!listing) return { title: "Listing", description: "Caitlyn Verdugo with KW Metro Atl" };

  const specs = [
    listing.beds != null && listing.baths != null ? `${listing.beds} bd / ${listing.baths} ba` : null,
    listing.property_type,
  ]
    .filter(Boolean)
    .join(" · ");
  const occupancy = listing.occupied_rooms != null && listing.total_rooms != null ? `${listing.occupied_rooms}/${listing.total_rooms} rooms occupied` : null;

  return {
    title: listing.address,
    description: [formatCurrency(listing.list_price), specs, occupancy].filter(Boolean).join(" · ") || "Caitlyn Verdugo with KW Metro Atl",
  };
}

export default async function PublicListingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const listing = await getPublicListing(slug);

  if (!listing) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-neutral-50 px-4 text-center">
        <p className="text-neutral-500">This listing isn&apos;t available anymore.</p>
      </main>
    );
  }

  const photos = listing.padsplit_photo_urls?.length ? listing.padsplit_photo_urls : listing.photoUrls;
  const specs = [
    listing.beds != null && listing.baths != null ? `${listing.beds} bd / ${listing.baths} ba` : null,
    listing.property_type,
    listing.sqft ? `${listing.sqft.toLocaleString()} sqft` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const hasOccupancy = listing.occupied_rooms != null && listing.total_rooms != null;
  const hasPriceRange = listing.price_low != null && listing.price_high != null;

  return (
    <main className="min-h-dvh bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        {photos.length > 0 && (
          <div className="mb-5 grid grid-cols-2 gap-2 overflow-hidden rounded-2xl sm:grid-cols-4">
            {photos.slice(0, 8).map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url + i} src={url} alt="" className={`aspect-square w-full object-cover ${i === 0 ? "col-span-2 row-span-2 aspect-square sm:col-span-2 sm:row-span-2" : ""}`} />
            ))}
          </div>
        )}

        <h1 className="font-serif text-3xl font-semibold text-neutral-900">{listing.address}</h1>
        <p className="mt-1 text-[15px] text-neutral-500">
          {formatCurrency(listing.list_price)}
          {specs ? ` · ${specs}` : ""}
        </p>

        {(hasOccupancy || hasPriceRange) && (
          <div className="mt-4 flex flex-wrap gap-4 rounded-2xl border border-neutral-200 bg-white p-4">
            {hasOccupancy && (
              <div>
                <p className="text-xs text-neutral-500">Occupancy</p>
                <p className="mt-0.5 font-serif text-lg font-semibold text-neutral-900">
                  {listing.occupied_rooms}/{listing.total_rooms} rooms
                </p>
              </div>
            )}
            {hasPriceRange && (
              <div>
                <p className="text-xs text-neutral-500">Room rates</p>
                <p className="mt-0.5 font-serif text-lg font-semibold text-neutral-900">
                  {formatCurrency(listing.price_low)} – {formatCurrency(listing.price_high)}
                  <span className="text-sm font-normal text-neutral-500">/week</span>
                </p>
              </div>
            )}
          </div>
        )}

        {listing.story && <p className="mt-5 whitespace-pre-line text-[15px] leading-6 text-neutral-700">{listing.story}</p>}

        <div className="mt-6">
          <PublicListingLeadForm slug={slug} />
        </div>

        <div className="mt-6 text-center text-sm text-neutral-500">
          <p className="font-semibold text-neutral-700">Caitlyn Verdugo with KW Metro Atl</p>
          <p className="mt-0.5">
            <a href="tel:+16788848494" className="text-brand-600">
              (678) 884-8494
            </a>{" "}
            ·{" "}
            <a href="mailto:cv.sellshomes@gmail.com" className="text-brand-600">
              cv.sellshomes@gmail.com
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
