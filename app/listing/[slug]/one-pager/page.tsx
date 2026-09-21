import type { Metadata } from "next";
import { getPublicListing } from "@/lib/listings/public-data";
import { publicListingCopy } from "@/lib/listings/public-copy";
import { formatPublicBand } from "@/lib/listings/public-bands";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Placeholder print view for the one-pager. The designed PDF template
// (layout, page order, cover) is the next design session. This route is the
// public slot: photos are not inlined, and line-item financials are omitted.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getPublicListing(slug);
  const nickname = listing ? publicListingCopy(listing.nickname) || "Offering" : "One-pager";
  return { title: `${nickname} — one-pager` };
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

  const nickname = publicListingCopy(listing.nickname) || "This PadSplit";
  const bands = [
    ["Gross rents", formatPublicBand(listing.band_gross_rent)],
    ["Operating expenses", formatPublicBand(listing.band_expense_load)],
    ["Cash-on-cash", formatPublicBand(listing.band_cash_on_cash)],
    ["Cap rate", formatPublicBand(listing.band_cap_rate)],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <main style={{ background: "#f4f1ec", color: "#211c19", minHeight: "100dvh", fontFamily: "var(--font-om-sans), Archivo, sans-serif" }}>
      <p data-om-noprint style={{ margin: 0, padding: "14px 28px", background: "#211c19", color: "#cdc4ba", fontSize: 13, lineHeight: 1.5 }}>
        One-pager template is not designed yet. This print view is a placeholder — public bands only, no line items. Use the browser print dialog to save a PDF.
      </p>
      <article style={{ maxWidth: 720, margin: "0 auto", padding: "36px 28px 64px" }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "0.18em", color: "#a33a29" }}>ONE-PAGER · {listing.om_number || "OM"}</p>
        <h1 style={{ margin: "12px 0 0", fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 40, lineHeight: 1.05 }}>{nickname}</h1>
        <p style={{ margin: "16px 0 0", fontFamily: "var(--font-om-serif)", fontSize: 28 }}>{formatCurrency(listing.list_price)}</p>
        {publicListingCopy(listing.public_description) && (
          <p style={{ margin: "22px 0 0", fontSize: 16, lineHeight: 1.7, color: "#2e2823", maxWidth: "62ch" }}>{publicListingCopy(listing.public_description)}</p>
        )}
        {bands.length > 0 && (
          <div style={{ marginTop: 28, borderTop: "1px solid #211c19" }}>
            {bands.map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "12px 0", borderBottom: "1px solid #ece5da" }}>
                <span style={{ fontSize: 13, letterSpacing: "0.08em", color: "#6b6259" }}>{label.toUpperCase()}</span>
                <span style={{ fontFamily: "var(--font-om-serif)", fontSize: 20 }}>{value}</span>
              </div>
            ))}
          </div>
        )}
        <p style={{ margin: "28px 0 0", fontSize: 12, lineHeight: 1.6, color: "#574f47" }}>
          Public summary only. Line-item financials stay on the offering page after unlock. Caitlyn Verdugo · Keller Williams Metro Atlanta · (678) 884-8494
        </p>
      </article>
    </main>
  );
}
