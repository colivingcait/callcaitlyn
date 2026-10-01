import type { Metadata } from "next";
import { getPublicListing } from "@/lib/listings/public-data";
import { publicBodyCopy, publicListingPrivacy } from "@/lib/listings/public-privacy";
import { formatPublicBand } from "@/lib/listings/public-bands";
import { isProjectedOpex } from "@/lib/listings/data-basis";
import { DataBasisNote, ProjectedMark } from "@/components/listings/om/DataBasisNote";
import { formatCurrency } from "@/lib/utils";
import { buildOgListingCard } from "@/lib/listings/og-card";
import { publicListingImageUrls, publicListingUrl, publicOgImage } from "@/lib/public-urls";

export const dynamic = "force-dynamic";

// Placeholder print view for the one-pager. The designed PDF template
// (layout, page order, cover) is the next design session. This route is the
// public slot: photos are not inlined, and line-item financials are omitted.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getPublicListing(slug);
  const nickname = listing ? publicListingPrivacy(listing).displayTitle : "One-pager";
  const canonical = `${publicListingUrl(slug)}/one-pager`;
  const card = listing ? buildOgListingCard(listing) : null;
  const images = card ? publicListingImageUrls(slug, card.version) : null;
  return {
    title: `${nickname} — one-pager`,
    alternates: { canonical },
    openGraph: {
      title: `${nickname} — one-pager`,
      url: canonical,
      ...(images && card ? { images: [publicOgImage(images.openGraph, card.title)] } : {}),
    },
    ...(images && card
      ? { twitter: { card: "summary_large_image" as const, images: [publicOgImage(images.twitter, card.title)] } }
      : {}),
  };
}

export default async function OnePagerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const listing = await getPublicListing(slug);
  if (!listing) {
    return (
      <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f1ec" }}>
        <p style={{ color: "#574f47" }}>This listing isn&apos;t available anymore.</p>
      </main>
    );
  }

  const privacy = publicListingPrivacy(listing);
  const nickname = privacy.displayTitle;
  const projected = isProjectedOpex(listing.data_basis_opex);
  const bands = [
    { label: "Gross rents", value: formatPublicBand(listing.band_gross_rent), projected: false },
    { label: "Operating expenses", value: formatPublicBand(listing.band_expense_load), projected },
    { label: "Cash-on-cash", value: formatPublicBand(listing.band_cash_on_cash), projected },
    { label: "Cap rate", value: formatPublicBand(listing.band_cap_rate), projected },
  ].filter((row): row is { label: string; value: string; projected: boolean } => Boolean(row.value));

  return (
    <main style={{ background: "#f4f1ec", color: "#1C1917", minHeight: "100dvh", fontFamily: "var(--font-om-sans), Archivo, sans-serif" }}>
      <p data-om-noprint style={{ margin: 0, padding: "14px 28px", background: "#1C1917", color: "#cdc4ba", fontSize: 13, lineHeight: 1.5 }}>
        One-pager template is not designed yet. This print view is a placeholder — public bands only, no line items. Use the browser print dialog to save a PDF.
      </p>
      <article style={{ maxWidth: 720, margin: "0 auto", padding: "36px 28px 64px" }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "0.18em", color: "#8B6535" }}>ONE-PAGER · {listing.om_number || "OM"}</p>
        <p style={{ margin: "12px 0 0", fontSize: 12, fontWeight: 500, letterSpacing: "0.16em", color: "#8B6535" }}>{privacy.locationLabel.toUpperCase()}</p>
        <h1 style={{ margin: "12px 0 0", fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 40, lineHeight: 1.05 }}>{nickname}</h1>
        {listing.list_price != null && (
          <p style={{ margin: "16px 0 0", fontFamily: "var(--font-om-serif)", fontSize: 28 }}>{formatCurrency(listing.list_price)}</p>
        )}
        {projected && <DataBasisNote note={listing.data_basis_opex_note} />}
        {publicBodyCopy(listing.public_description, privacy) && (
          <p style={{ margin: "22px 0 0", fontSize: 16, lineHeight: 1.7, color: "#2e2823", maxWidth: "62ch" }}>{publicBodyCopy(listing.public_description, privacy)}</p>
        )}
        {bands.length > 0 && (
          <div style={{ marginTop: 28, borderTop: "1px solid #1C1917" }}>
            {bands.map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "12px 0", borderBottom: "1px solid #ece5da" }}>
                <span style={{ fontSize: 13, letterSpacing: "0.08em", color: "#6b6259" }}>
                  {row.label.toUpperCase()}
                  {row.projected ? <ProjectedMark /> : null}
                </span>
                <span style={{ fontFamily: "var(--font-om-serif)", fontSize: 20 }}>{row.value}</span>
              </div>
            ))}
          </div>
        )}
        <p style={{ margin: "28px 0 0", fontSize: 12, lineHeight: 1.6, color: "#574f47" }}>
          Public summary only. Line-item financials stay on the offering page after unlock. Caitlyn Verdugo · Keller Williams Metro Atlanta · 678-884-4494
        </p>
      </article>
    </main>
  );
}
