import Link from "next/link";
import type { Metadata } from "next";
import { getPublicListings } from "@/lib/listings/public-data";
import { publicListingCopy } from "@/lib/listings/public-copy";
import { formatCurrency } from "@/lib/utils";

// Occupancy/pricing refresh daily and listings get published/unpublished
// on demand - this must never be served from a stale build-time cache.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Available Listings",
  description: "Caitlyn Verdugo with KW Metro Atl",
};

export default async function PublicListingsOverviewPage() {
  const listings = await getPublicListings();

  return (
    <main style={{ minHeight: "100dvh", background: "#f4f1ec", padding: "0 16px 56px", fontFamily: "var(--font-om-sans), Archivo, ui-sans-serif, system-ui, sans-serif" }}>
      <header style={{ margin: "0 auto", maxWidth: 720, padding: "20px 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <Link href="/listing" style={{ fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 22, color: "#211c19" }}>
          CallCaitlyn
        </Link>
        <nav style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13, fontWeight: 600, letterSpacing: "0.06em", color: "#a33a29" }}>
          <Link href="/book">BOOK A CALL</Link>
          <a href="tel:+16788848494">(678) 884-8494</a>
        </nav>
      </header>

      <div style={{ margin: "0 auto", maxWidth: 720, paddingTop: 24 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "0.2em", color: "#a33a29" }}>CALLCAITLYN LISTINGS</p>
        <h1 style={{ margin: "16px 0 0", fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 40, color: "#211c19" }}>Available listings</h1>
        <p style={{ margin: "10px 0 0", fontSize: 15, color: "#574f47" }}>Caitlyn Verdugo · Keller Williams Metro Atlanta</p>

        {listings.length === 0 ? (
          <p style={{ marginTop: 48, textAlign: "center", fontSize: 14, color: "#a39a8e" }}>No listings available right now.</p>
        ) : (
          <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 12 }}>
            {listings.map((listing) => {
              const cover = listing.padsplit_photo_urls?.[0] ?? listing.photoUrls[0] ?? null;
              const occ = listing.occupied_rooms != null && listing.total_rooms != null ? `${listing.occupied_rooms}/${listing.total_rooms} occupied` : "Coming soon";
              const title = publicListingCopy(listing.nickname) || publicListingCopy(listing.property_type) || "Listing";

              return (
                <Link
                  key={listing.id}
                  href={`/listing/${listing.public_slug}`}
                  style={{ display: "flex", alignItems: "center", gap: 16, border: "1px solid #ddd6cc", background: "#fffdfa", padding: 16, color: "inherit" }}
                >
                  <div style={{ height: 84, width: 84, flexShrink: 0, overflow: "hidden", background: "#ece6dd" }}>
                    {cover && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt={title} style={{ height: "100%", width: "100%", objectFit: "cover" }} />
                    )}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ margin: 0, fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 20, color: "#211c19", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {title}
                    </p>
                    <p style={{ margin: "6px 0 0", fontSize: 14, color: "#574f47" }}>
                      {formatCurrency(listing.list_price)} · {listing.total_rooms ?? "?"} rooms · {occ}
                    </p>
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
