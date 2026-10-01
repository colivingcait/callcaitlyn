import type { Metadata } from "next";
import { getPublicListingsIndex } from "@/lib/listings/public-data";
import { listingsQueryString } from "@/lib/listings/public-index";
import { ListingsViewToggle } from "@/components/listings/index/ListingsViewToggle";
import { ListingsMapCanvas } from "@/components/listings/index/ListingsMapCanvas";
import { PUBLIC_LISTINGS_URL } from "@/lib/public-urls";

export const dynamic = "force-dynamic";

const MAP_URL = `${PUBLIC_LISTINGS_URL}/map`;

export const metadata: Metadata = {
  title: "Available Listings · Map",
  description: "Caitlyn Verdugo with KW Metro Atl",
  alternates: { canonical: MAP_URL },
  openGraph: { title: "Available Listings · Map", description: "Caitlyn Verdugo with KW Metro Atl", url: MAP_URL },
};

export default async function PublicListingsMapPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = searchParams ? await searchParams : {};
  const search = listingsQueryString(raw);
  const { available } = await getPublicListingsIndex();
  const mapped = available.filter((listing) => listing.showMapPin);

  return (
    <div className="om-page listings-map-page" style={{ fontFamily: "var(--font-om-sans), \"DM Sans\", ui-sans-serif, system-ui, sans-serif", background: "#fff", color: "#1C1917", minHeight: "100dvh", overflowX: "clip" }}>
      <div className="om-gutter" style={{ margin: "0 auto", maxWidth: 1180, padding: "40px 28px 64px" }}>
        <p className="listings-map-phone-note" style={{ margin: "0 0 18px", fontSize: 15, lineHeight: 1.6, color: "#574f47" }}>
          The map is available on a larger screen. {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/listings" style={{ color: "#8B6535", fontWeight: 600 }}>View the listings</a>.
        </p>
        <div className="om-section-head" style={{ display: "flex", alignItems: "baseline", gap: 16, borderBottom: "1px solid #211c19", paddingBottom: 12, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 32, lineHeight: 1, color: "#211c19" }}>Available listings</h1>
          <ListingsViewToggle active="map" search={search} />
        </div>
        <ListingsMapCanvas listings={mapped} />
      </div>
    </div>
  );
}
