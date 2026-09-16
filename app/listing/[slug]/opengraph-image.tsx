import { ImageResponse } from "next/og";
import { getPublicListing } from "@/lib/listings/public-data";
import { formatCurrency } from "@/lib/utils";

export const runtime = "edge";
export const alt = "Listing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const listing = await getPublicListing(slug);

  // Nickname only - the address is never shown anywhere on this listing's
  // public surface, including its own link preview.
  const nickname = listing ? listing.nickname || "PadSplit Listing" : "Listing";
  const photo = listing ? (listing.padsplit_photo_urls?.[0] ?? listing.photoUrls[0] ?? null) : null;
  const specs = listing
    ? [listing.beds != null && listing.baths != null ? `${listing.beds} bd / ${listing.baths} ba` : null, listing.property_type].filter(Boolean).join(" · ")
    : null;
  const priceLine = listing ? [formatCurrency(listing.list_price), specs].filter(Boolean).join(" · ") : null;

  // With a real photo: full-bleed background + dark gradient overlay so
  // white text stays legible over any image. Without one (a listing added
  // before photos are uploaded, or the slug not resolving at all): the
  // same brand-gradient card style as book/opengraph-image.tsx, so the
  // preview never falls back to a broken image.
  if (photo) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              padding: 56,
              background: "linear-gradient(0deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 55%, rgba(0,0,0,0) 100%)",
            }}
          >
            <div style={{ fontSize: 54, fontWeight: 700, color: "#ffffff" }}>{nickname}</div>
            {priceLine && <div style={{ fontSize: 28, color: "#f5f5f4", marginTop: 10 }}>{priceLine}</div>}
          </div>
        </div>
      ),
      { ...size },
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #fdf3f2 0%, #ffffff 70%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 88,
            height: 88,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 24,
            background: "#ac3826",
            fontSize: 44,
            marginBottom: 32,
          }}
        >
          🏠
        </div>
        <div style={{ fontSize: 54, fontWeight: 700, color: "#1c1917" }}>{nickname}</div>
        {priceLine && <div style={{ fontSize: 28, color: "#78716c", marginTop: 18 }}>{priceLine}</div>}
      </div>
    ),
    { ...size },
  );
}
