import type { Metadata } from "next";
import { getPublicListingsIndex } from "@/lib/listings/public-data";
import { listingsQueryString } from "@/lib/listings/public-index";
import { ListingsIndexHeader } from "@/components/listings/index/ListingsIndexHeader";
import { ListingsViewToggle } from "@/components/listings/index/ListingsViewToggle";
import { ListingsMapCanvas } from "@/components/listings/index/ListingsMapCanvas";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Available Listings · Map",
  description: "Caitlyn Verdugo with KW Metro Atl",
};

export default async function PublicListingsMapPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = searchParams ? await searchParams : {};
  const search = listingsQueryString(raw);
  const { available } = await getPublicListingsIndex();

  return (
    <div className="om-page" style={{ fontFamily: "var(--font-om-sans), Archivo, ui-sans-serif, system-ui, sans-serif", background: "#f4f1ec", color: "#211c19", minHeight: "100dvh", overflowX: "clip" }}>
      <ListingsIndexHeader />
      <div className="om-gutter" style={{ margin: "0 auto", maxWidth: 1180, padding: "40px 28px 64px" }}>
        <div className="om-section-head" style={{ display: "flex", alignItems: "baseline", gap: 16, borderBottom: "1px solid #211c19", paddingBottom: 12, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 32, lineHeight: 1, color: "#211c19" }}>Available listings</h1>
          <ListingsViewToggle active="map" search={search} />
        </div>
        <ListingsMapCanvas listings={available} />
      </div>
    </div>
  );
}
