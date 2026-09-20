import type { Metadata } from "next";
import Link from "next/link";
import { getPublicListing, getPublicListings } from "@/lib/listings/public-data";
import { formatCurrency } from "@/lib/utils";
import { PhotoCarousel } from "@/components/listings/om/PhotoCarousel";
import { FinancialGate } from "@/components/listings/om/FinancialGate";
import { OfferSection } from "@/components/listings/om/OfferSection";
import { SellerAnalysisForm } from "@/components/listings/om/SellerAnalysisForm";
import { MobileActionBar } from "@/components/listings/om/MobileActionBar";
import { UnlockedProvider } from "@/components/listings/om/UnlockContext";
import { OmHeaderNav } from "@/components/listings/om/OmHeaderNav";
import { publicListingCopy } from "@/lib/listings/public-copy";
import { asListingFinancials } from "@/lib/listings/crm-marketing-fields";
import { occupancyFromFinancials, occupancyTrendHasSidecarData, t12OccupancySummary } from "@/lib/listings/occupancy";

// Occupancy changes daily and a listing can be unpublished at any time -
// this must never be served from a stale build-time cache.
export const dynamic = "force-dynamic";

const OWNER_PHONE_HREF = "tel:+16788848494";
const OWNER_EMAIL = "cv.sellshomes@gmail.com";

const PROCESS_STEPS = [
  {
    title: "Review the offering",
    body: "Everything on this page, plus the line-item underwriting and buyer workbook once you unlock. Questions get answered before you write anything.",
  },
  {
    title: "Make an offer",
    body: "The button on this page connects you to me to write it — an offer has to be on GAR forms before it can go to the seller. We'll talk your terms through first.",
  },
  {
    title: "See it in person during DD",
    body: "The house is occupied, so showings happen during due diligence. The address is shared with serious buyers considering an offer, to protect everyone in the home.",
  },
  {
    title: "Transaction & handoff",
    body: "Members stay in place through closing, and the PadSplit account, member agreements, and deposits transfer to you.",
  },
] as const;

function nicknameOf(listing: { nickname: string | null }): string {
  return publicListingCopy(listing.nickname) || "This PadSplit";
}

// Never the street address, anywhere - it's shared only at showing.
// generateMetadata and the OG image both key off the nickname.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getPublicListing(slug);
  if (!listing) return { title: "Offering Memorandum", description: "Caitlyn Verdugo with KW Metro Atl" };

  const nickname = nicknameOf(listing);
  const occupancy = listing.liveOccupied != null && listing.liveTotal != null ? `${listing.liveOccupied}/${listing.liveTotal} rooms occupied` : null;
  return {
    title: nickname,
    description: [formatCurrency(listing.list_price), listing.liveTotal ? `${listing.liveTotal} rooms` : null, occupancy].filter(Boolean).join(" · "),
  };
}

export default async function OfferingMemorandumPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const listing = await getPublicListing(slug);

  if (!listing) {
    return (
      <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f1ec", padding: 16, textAlign: "center" }}>
        <p style={{ color: "#574f47" }}>This listing isn&apos;t available anymore.</p>
      </main>
    );
  }

  const nickname = nicknameOf(listing);
  const story = publicListingCopy(listing.story);
  const publicDescription = publicListingCopy(listing.public_description);
  const omNumber = listing.om_number || "OM";
  const eyebrow = ["OFFERING MEMORANDUM", publicListingCopy(listing.submarket), "COLIVING"].filter(Boolean).join(" · ");

  const liveOccupied = listing.liveOccupied;
  const liveTotal = listing.liveTotal;
  const perRoom = listing.list_price && liveTotal ? formatCurrency(Math.round(listing.list_price / liveTotal)) : null;
  const hasOccupancy = liveOccupied != null && liveTotal != null;
  const occupancyPct = hasOccupancy ? Math.round((liveOccupied / liveTotal) * 100) : null;
  const hasPriceRange = listing.price_low != null && listing.price_high != null;
  const specs = [
    listing.beds != null ? `${listing.beds}` : null,
    listing.baths != null ? `${listing.baths}` : null,
  ];

  const propertyCells: { label: string; value: string | null }[] = [
    { label: "PROPERTY TYPE", value: publicListingCopy(listing.property_type) },
    { label: "SQUARE FEET", value: listing.sqft ? listing.sqft.toLocaleString() : null },
    { label: "BUILT / RENOVATED", value: [listing.year_built, listing.year_renovated].filter(Boolean).join(" / ") || null },
    {
      label: "ON PADSPLIT SINCE",
      value: listing.padsplit_since ? new Date(listing.padsplit_since).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }) : null,
    },
    { label: "ROOM RATES", value: hasPriceRange ? `${formatCurrency(listing.price_low)}–${formatCurrency(listing.price_high)} / wk` : null },
    { label: "PARKING", value: listing.parking },
    { label: "LAUNDRY", value: listing.laundry },
    { label: "FURNISHINGS", value: listing.furnishings },
  ].filter((c) => c.value);

  const publicFinCells = [
    { label: "GROSS RENTS", value: listing.band_gross_rent, caption: "All rooms at in-place weekly rates." },
    { label: "OPERATING EXPENSES", value: listing.band_expense_load, caption: "Utilities, cleaning, platform fees, taxes, reserves." },
    { label: "CASH-ON-CASH", value: listing.band_cash_on_cash, caption: "Conventional financing, current rates." },
    { label: "CAP RATE", value: listing.band_cap_rate, caption: "On in-place income." },
  ].filter((c) => c.value);

  const sidecarOccupancy = occupancyFromFinancials(asListingFinancials(listing.financials));
  const hasT12 = occupancyTrendHasSidecarData(listing.occupancyTrend);
  const trendSummary = t12OccupancySummary(sidecarOccupancy, listing.occupancyTrend);

  const otherListings = (await getPublicListings()).filter((l) => l.public_slug !== slug).slice(0, 3);

  const sectionHead = (title: string, numeral: string, extra?: React.ReactNode) => (
    <div className="om-section-head" style={{ display: "flex", alignItems: "baseline", gap: 16, borderBottom: "1px solid #211c19", paddingBottom: 12, flexWrap: "wrap" }}>
      <h2 style={{ margin: 0, fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 32, lineHeight: 1, color: "#211c19" }}>{title}</h2>
      {extra}
      <p style={{ margin: "0 0 0 auto", fontSize: 12, letterSpacing: "0.1em", color: "#6b6259" }}>{numeral}</p>
    </div>
  );

  return (
    <UnlockedProvider slug={slug}>
      <div className="om-page" style={{ fontFamily: "var(--font-om-sans), Archivo, ui-sans-serif, system-ui, sans-serif", background: "#f4f1ec", minHeight: "100dvh", color: "#211c19" }}>
        <header data-om-noprint style={{ position: "sticky", top: 0, zIndex: 30, background: "#211c19", borderBottom: "1px solid #332b26" }}>
          <div className="om-header-inner" style={{ margin: "0 auto", maxWidth: 1180, padding: "0 28px", display: "flex", alignItems: "center", gap: 24, height: 62 }}>
            <p className="om-header-brand" style={{ margin: 0, fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 21, letterSpacing: "0.01em", color: "#f4f1ec", whiteSpace: "nowrap" }}>{nickname}</p>
            <span className="om-header-rule" style={{ width: 1, height: 22, background: "#453b34" }} />
            <p className="om-header-meta" style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "0.18em", color: "#a39a8e", whiteSpace: "nowrap" }}>{omNumber}</p>
            <OmHeaderNav />
          </div>
        </header>

        <div data-om-printonly style={{ display: "none", borderBottom: "2px solid #211c19", paddingBottom: 14, margin: "22px 28px 0" }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 500, letterSpacing: "0.18em", color: "#6b6259" }}>OFFERING MEMORANDUM · {omNumber} · CONFIDENTIAL</p>
          <p style={{ margin: "8px 0 0", fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 26, color: "#211c19" }}>{nickname}</p>
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "#574f47" }}>
            Caitlyn Verdugo · Keller Williams Metro Atlanta · (678) 884-8494 · {OWNER_EMAIL}
          </p>
        </div>

        <PhotoCarousel photos={listing.photos} coverUrl={listing.coverPhotoUrl} nickname={nickname} eyebrow={eyebrow} summary={story} />

        <div className="om-stats-wrap om-gutter" style={{ background: "#211c19", color: "#f4f1ec", padding: "0 28px 34px" }}>
          <div className="om-stats" style={{ margin: "0 auto", maxWidth: 1180, display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", borderTop: "1px solid #3a322c" }}>
            <div style={{ padding: "20px 24px 22px 0", borderRight: "1px solid #3a322c" }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "0.16em", color: "#a39a8e" }}>ASKING PRICE</p>
              <p style={{ margin: "10px 0 0", fontFamily: "var(--font-om-serif)", fontSize: 36, lineHeight: 1, color: "#f4f1ec" }}>{formatCurrency(listing.list_price)}</p>
              {perRoom && <p style={{ margin: "7px 0 0", fontSize: 13, color: "#b3aaa0" }}>{perRoom} per room</p>}
            </div>
            <div style={{ padding: "20px 24px 22px", borderRight: "1px solid #3a322c" }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "0.16em", color: "#a39a8e" }}>BEDS / BATHS</p>
              <p style={{ margin: "10px 0 0", fontFamily: "var(--font-om-serif)", fontSize: 36, lineHeight: 1, color: "#f4f1ec" }}>
                {specs[0] ?? "—"} <span style={{ fontSize: 20, color: "#a39a8e" }}>bd</span> / {specs[1] ?? "—"} <span style={{ fontSize: 20, color: "#a39a8e" }}>ba</span>
              </p>
              <p style={{ margin: "7px 0 0", fontSize: 13, color: "#b3aaa0" }}>
                {[listing.private_bathrooms != null ? `${listing.private_bathrooms} private bathrooms` : null, listing.sqft ? `${listing.sqft.toLocaleString()} sqft` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div style={{ padding: "20px 24px 22px", borderRight: "1px solid #3a322c" }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "0.16em", color: "#a39a8e" }}>CAP RATE</p>
              <p style={{ margin: "10px 0 0", fontFamily: "var(--font-om-serif)", fontSize: 36, lineHeight: 1, color: "#f4f1ec" }}>
                {listing.band_cap_rate || (
                  <a href="#unlock" className="om-hover-light" style={{ color: "inherit", fontSize: 22, letterSpacing: "0.04em" }}>
                    Unlock
                  </a>
                )}
              </p>
              <p style={{ margin: "7px 0 0", fontSize: 13, color: "#b3aaa0" }}>{listing.band_cap_rate ? "On in-place income" : "Share contact info to see the numbers"}</p>
            </div>
            <div style={{ padding: "20px 0 22px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: "#e26e5d", boxShadow: "0 0 0 3px rgba(226,110,93,0.22)" }} />
                <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "0.16em", color: "#e9a396", whiteSpace: "nowrap" }}>LIVE OCCUPANCY</p>
              </div>
              <p style={{ margin: "10px 0 0", fontFamily: "var(--font-om-serif)", fontSize: 36, lineHeight: 1, color: "#f4f1ec" }}>
                {hasOccupancy ? (
                  <>
                    {liveOccupied} <span style={{ fontSize: 20, color: "#a39a8e" }}>of {liveTotal}</span>
                  </>
                ) : (
                  "—"
                )}
              </p>
              <p style={{ margin: "7px 0 0", fontSize: 13, color: "#b3aaa0" }}>From PadSplit · pulled daily</p>
            </div>
          </div>
        </div>

        <div className="om-wrap" style={{ margin: "0 auto", maxWidth: 1180, padding: "0 28px 96px" }}>
          <div className="om-body" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 320px)", gap: 56, paddingTop: 64 }}>
            <main style={{ display: "flex", flexDirection: "column", gap: 72 }}>
              {publicDescription && (
                <section>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "0.2em", color: "#a33a29" }}>THE OFFERING</p>
                  <div style={{ marginTop: 20, display: "grid", gap: 20, fontSize: 17, lineHeight: 1.75, color: "#2e2823", maxWidth: "66ch" }}>
                    {publicDescription.split(/\n{2,}/).map((para, i) => (
                      <p key={i} style={i === 0 ? { margin: 0, fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 26, lineHeight: 1.45, color: "#211c19" } : { margin: 0 }}>
                        {para}
                      </p>
                    ))}
                  </div>
                </section>
              )}

              {propertyCells.length > 0 && (
                <section id="property">
                  {sectionHead("Property detail", "01")}
                  <div className="om-cells" style={{ marginTop: 22, display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }}>
                    {propertyCells.map((cell) => (
                      <div key={cell.label} style={{ background: "#fffdfa", border: "1px solid #e4ddd2", padding: "16px 18px 18px" }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "0.14em", color: "#6b6259" }}>{cell.label}</p>
                        <p style={{ margin: "10px 0 0", fontWeight: 500, fontSize: 19, lineHeight: 1.3, color: "#211c19" }}>{cell.value}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {hasOccupancy && (
                <section id="occupancy">
                  {sectionHead(
                    "Occupancy",
                    "02",
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: "#cc4a37", boxShadow: "0 0 0 3px rgba(204,74,55,0.18)" }} />
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "0.14em", color: "#a33a29" }}>LIVE FROM PADSPLIT · PULLED DAILY</p>
                    </div>,
                  )}

                  <div style={{ marginTop: 26, borderTop: "2px solid #cc4a37", borderBottom: "1px solid #ddd6cc", padding: "22px 0 26px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 7, height: 7, borderRadius: 999, background: "#cc4a37", boxShadow: "0 0 0 3px rgba(204,74,55,0.18)" }} />
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "0.16em", color: "#a33a29" }}>CURRENT OCCUPANCY</p>
                    </div>
                    <div style={{ marginTop: 16, display: "flex", alignItems: "flex-end", gap: 30, flexWrap: "wrap" }}>
                      <p style={{ margin: 0, fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 50, lineHeight: 1.06, color: "#211c19", whiteSpace: "nowrap" }}>
                        {liveOccupied} <span style={{ fontSize: 25, fontWeight: 400, color: "#6b6259" }}>of {liveTotal} rooms</span>
                      </p>
                      <p style={{ margin: 0, fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 36, lineHeight: 1, color: "#a33a29" }}>{occupancyPct}%</p>
                    </div>
                    <div style={{ marginTop: 18, display: "flex", gap: 5 }}>
                      {Array.from({ length: liveTotal ?? 0 }, (_, i) => (
                        <span key={i} style={{ flex: 1, height: 8, background: i < (liveOccupied ?? 0) ? "#cc4a37" : "#e4ddd2" }} />
                      ))}
                    </div>
                    <p style={{ margin: "18px 0 0", fontSize: 14, lineHeight: 1.7, color: "#574f47", maxWidth: "62ch" }}>
                      Scraped from the property&apos;s live PadSplit listing
                      {listing.last_scraped_at
                        ? ` — last pulled ${new Date(listing.last_scraped_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })} ET`
                        : ""}
                      . This is what the house is doing right now, which is not always what the T12 shows.
                    </p>
                  </div>

                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 18, flexWrap: "wrap", paddingTop: 34 }}>
                    <p style={{ margin: 0, fontFamily: "var(--font-om-serif)", fontSize: 22, color: "#211c19" }}>T12</p>
                    {trendSummary && <p style={{ margin: 0, fontSize: 13, color: "#574f47" }}>{trendSummary}</p>}
                  </div>
                  <div className="om-occupancy-chart" style={{ marginTop: 22 }}>
                    <div className="om-occupancy-chart-inner" style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0,1fr))", gap: 5, alignItems: "end", height: 132 }}>
                      {listing.occupancyTrend.map((month, i) => (
                        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9, height: "100%", justifyContent: "flex-end" }}>
                          <span style={{ flex: "0 0 auto", fontSize: 11, color: "#574f47" }}>{month.total ? `${month.pct}%` : ""}</span>
                          <div
                            style={{
                              flex: "0 0 auto",
                              width: "100%",
                              background: month.pct === 100 ? "#211c19" : month.pct >= 88 ? "#cc4a37" : month.total ? "#e9a396" : "#e4ddd2",
                              height: `${Math.round((month.pct / 100) * 88)}px`,
                            }}
                          />
                          <span style={{ flex: "0 0 auto", fontSize: 10, letterSpacing: "0.04em", color: "#6b6259" }}>{month.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p style={{ margin: "16px 0 0", fontSize: 13, lineHeight: 1.6, color: "#574f47", maxWidth: "74ch" }}>
                    {hasT12
                      ? "T12 occupancy is from Vera's buyer workbook (bed-night). The live count above is today's PadSplit snapshot."
                      : "T12 occupancy comes from Vera's buyer workbook. Apply the sidecar to populate this chart. The live count above is today's PadSplit snapshot."}
                  </p>
                </section>
              )}

              <section id="financials">
                {sectionHead("Financial overview", "03")}
                {publicFinCells.length > 0 && (
                  <div className="om-fin" style={{ marginTop: 22, display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 14 }}>
                    {publicFinCells.map((cell) => (
                      <div key={cell.label} style={{ background: "#fffdfa", border: "1px solid #e4ddd2", borderTop: "2px solid #211c19", padding: "20px 20px 22px" }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "0.14em", color: "#6b6259" }}>{cell.label}</p>
                        <p style={{ margin: "14px 0 0", fontFamily: "var(--font-om-serif)", fontSize: 34, lineHeight: 1, color: "#211c19" }}>{cell.value}</p>
                        <p style={{ margin: "10px 0 0", fontSize: 13, lineHeight: 1.55, color: "#574f47" }}>{cell.caption}</p>
                      </div>
                    ))}
                  </div>
                )}
                <p style={{ margin: "22px 0 0", fontSize: 14, lineHeight: 1.7, color: "#574f47", maxWidth: "70ch" }}>
                  {publicFinCells.length > 0
                    ? "The asking price reflects both local comparable sales and the income the asset produces — coliving houses are underwritten on revenue per room, not on the price-per-square-foot of the street alone."
                    : "Line-item rent, expenses, and cap rate are locked until you share a name and a phone or email. Nothing here is a projection — it is the seller’s underwriting, unlocked on this page."}
                </p>
                <div id="unlock" style={{ paddingTop: 6 }}>
                  <FinancialGate slug={slug} omNumber={omNumber} improvements={listing.improvements} />
                </div>
              </section>
            </main>

            <aside className="om-aside" style={{ alignSelf: "stretch" }}>
              <div className="om-aside-sticky" style={{ position: "sticky", top: 94, display: "flex", flexDirection: "column", gap: 24 }}>
                <div style={{ background: "#211c19", border: "1px solid #211c19" }}>
                  <div style={{ padding: "18px 20px 0" }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "0.18em", color: "#e9a396" }}>YOUR CONTACT FOR THIS OFFERING</p>
                  </div>
                  <div style={{ display: "flex", gap: 14, padding: "16px 20px 0" }}>
                    <div style={{ flex: "0 0 84px", height: 104, background: "repeating-linear-gradient(135deg, #322a25 0 10px, #2a231f 10px 20px)" }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 24, lineHeight: 1.1, color: "#f4f1ec" }}>Caitlyn Verdugo</p>
                      <p style={{ margin: "8px 0 0", fontSize: 12, fontWeight: 500, letterSpacing: "0.1em", lineHeight: 1.5, color: "#a39a8e" }}>LISTING AGENT · KELLER WILLIAMS METRO ATLANTA</p>
                    </div>
                  </div>
                  <div style={{ padding: "14px 20px 16px" }}>
                    <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: "#ded6cc" }}>
                      Coliving and house-hacking operators are most of my book — PadSplit houses, room rentals, and other investment property are what I list.
                    </p>
                  </div>
                  <div style={{ borderTop: "1px solid #3a322c", display: "flex", flexDirection: "column" }}>
                    <a href={OWNER_PHONE_HREF} className="om-hover-fill" style={{ padding: "13px 20px", fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 20, color: "#f4f1ec", borderBottom: "1px solid #3a322c" }}>
                      (678) 884-8494
                    </a>
                    <a href={`mailto:${OWNER_EMAIL}`} className="om-hover-fill" style={{ padding: "13px 20px", fontSize: 15, color: "#e9a396", borderBottom: "1px solid #3a322c", overflowWrap: "anywhere" }}>
                      {OWNER_EMAIL}
                    </a>
                  </div>
                  <div style={{ padding: "16px 20px 18px" }}>
                    <Link href="/book" className="om-hover-fill-border" style={{ display: "block", border: "1px solid #cc4a37", background: "#cc4a37", padding: "13px 16px", textAlign: "center", fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", color: "#fff" }}>
                      BOOK A 20-MINUTE CALL
                    </Link>
                  </div>
                </div>

                {listing.co_agent_name && (
                  <div style={{ border: "1px solid #ddd6cc", background: "#fffdfa" }}>
                    <div style={{ padding: "16px 20px 0" }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "0.16em", color: "#6b6259" }}>CO-LISTING AGENT</p>
                    </div>
                    <div style={{ display: "flex", gap: 14, padding: "16px 20px 18px" }}>
                      <div style={{ flex: "0 0 62px", height: 78, background: "repeating-linear-gradient(135deg, #ece6dd 0 8px, #e2dbd0 8px 16px)" }} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 19, lineHeight: 1.15, color: "#211c19" }}>{listing.co_agent_name}</p>
                        {listing.co_agent_brokerage && <p style={{ margin: "7px 0 0", fontSize: 13, lineHeight: 1.5, color: "#574f47" }}>{listing.co_agent_brokerage}</p>}
                      </div>
                    </div>
                    <div style={{ borderTop: "1px solid #ede7de", display: "flex", flexDirection: "column" }}>
                      {listing.co_agent_phone && (
                        <a href={`tel:${listing.co_agent_phone.replace(/[^0-9+]/g, "")}`} className="om-hover-dark" style={{ padding: "12px 20px", fontWeight: 500, fontSize: 16, color: "#211c19", borderBottom: "1px solid #ede7de" }}>
                          {listing.co_agent_phone}
                        </a>
                      )}
                      {listing.co_agent_email && (
                        <a href={`mailto:${listing.co_agent_email}`} className="om-hover-dark" style={{ padding: "12px 20px", fontSize: 13, color: "#a33a29", overflowWrap: "anywhere" }}>
                          {listing.co_agent_email}
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {otherListings.length > 0 && (
                  <div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "0.18em", color: "#6b6259" }}>MORE OF CAITLYN&apos;S LISTINGS</p>
                    {otherListings.map((l) => {
                      const cover = l.coverPhotoUrl;
                      const occ = l.liveOccupied != null && l.liveTotal != null ? `${l.liveOccupied}/${l.liveTotal} occupied` : "Coming soon";
                      return (
                        <Link
                          key={l.id}
                          href={`/listing/${l.public_slug}`}
                          className="om-hover-dim"
                          style={{ display: "flex", gap: 14, padding: "16px 0", borderBottom: "1px solid #ddd6cc", color: "inherit", marginTop: 10 }}
                        >
                          <div style={{ flex: "0 0 58px", height: 58, background: cover ? undefined : "repeating-linear-gradient(135deg, #ece6dd 0 8px, #e2dbd0 8px 16px)" }}>
                            {cover && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={cover} alt={publicListingCopy(l.nickname) || publicListingCopy(l.property_type) || "Listing"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            )}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, fontWeight: 500, fontSize: 16, color: "#211c19" }}>{publicListingCopy(l.nickname) || publicListingCopy(l.property_type) || "Listing"}</p>
                            <p style={{ margin: "5px 0 0", fontSize: 13, color: "#574f47" }}>
                              {formatCurrency(l.list_price)} · {l.liveTotal ?? "?"} rooms · {occ}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                    <Link href="/listing" className="om-hover-accent" style={{ display: "inline-block", marginTop: 14, fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", color: "#a33a29" }}>
                      VIEW ALL LISTINGS →
                    </Link>
                  </div>
                )}

                {listing.show_seller_section && (
                  <div style={{ borderTop: "2px solid #cc4a37", paddingTop: 16 }}>
                    <p style={{ margin: 0, fontWeight: 500, fontSize: 18, lineHeight: 1.3, color: "#211c19" }}>Selling a PadSplit in the next 12 months?</p>
                    <p style={{ margin: "10px 0 0", fontSize: 13, lineHeight: 1.6, color: "#574f47" }}>
                      A lot of operators are consolidating right now. I&apos;ll tell you what yours is worth before you list it.
                    </p>
                    <a href="#seller" className="om-hover-accent" style={{ display: "inline-block", marginTop: 12, fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", color: "#a33a29" }}>
                      REQUEST AN ANALYSIS →
                    </a>
                  </div>
                )}
              </div>
            </aside>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 72, paddingTop: 72 }}>
            <section id="process">
              {sectionHead("The process", "04")}
              <div className="om-process" style={{ marginTop: 26, display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 16 }}>
                {PROCESS_STEPS.map((step, i) => (
                  <div
                    key={step.title}
                    style={{
                      borderTop: "2px solid #cc4a37",
                      borderRight: "1px solid #ddd6cc",
                      borderBottom: "1px solid #ddd6cc",
                      borderLeft: "1px solid #ddd6cc",
                      background: "#fffdfa",
                      padding: "18px 18px 22px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, letterSpacing: "0.14em", color: "#cc4a37" }}>{String(i + 1).padStart(2, "0")}</p>
                    <p style={{ margin: 0, fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 20, lineHeight: 1.2, color: "#211c19" }}>{step.title}</p>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: "#574f47" }}>{step.body}</p>
                  </div>
                ))}
              </div>
            </section>

            <OfferSection slug={slug} nickname={nickname} omNumber={omNumber} />

            {listing.show_seller_section && (
              <section id="seller" data-om-noprint style={{ background: "#211c19", color: "#f4f1ec", padding: "44px 36px 46px" }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "0.2em", color: "#e9a396" }}>FOR PADSPLIT OWNERS</p>
                <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(290px, 100%), 1fr))", gap: 40, alignItems: "start" }}>
                  <div>
                    <h2 style={{ margin: 0, fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 34, lineHeight: 1.12, color: "#f4f1ec", maxWidth: "22ch" }}>
                      What would your PadSplit sell for?
                    </h2>
                    <p style={{ margin: "18px 0 0", fontSize: 16, lineHeight: 1.7, color: "#d6cfc5", maxWidth: "50ch" }}>
                      A coliving house gets priced two ways at once: the local comps, and the income the asset actually produces. I run both — what houses
                      like yours have traded for in your submarket, alongside room revenue, a realistic expense load, and what in-place occupancy supports.
                      Where those two land tells you the list price.
                    </p>
                    <div style={{ marginTop: 28, display: "flex", gap: 40, flexWrap: "wrap" }}>
                      <div>
                        <p style={{ margin: 0, fontFamily: "var(--font-om-serif)", fontSize: 26, color: "#f4f1ec" }}>48 hours</p>
                        <p style={{ margin: "6px 0 0", fontSize: 12, letterSpacing: "0.1em", color: "#a39a8e" }}>WRITTEN ANALYSIS BACK</p>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontFamily: "var(--font-om-serif)", fontSize: 26, color: "#f4f1ec" }}>No pressure</p>
                        <p style={{ margin: "6px 0 0", fontSize: 12, letterSpacing: "0.1em", color: "#a39a8e" }}>EVALUATION OF YOUR PADSPLIT</p>
                      </div>
                    </div>
                  </div>
                  <SellerAnalysisForm />
                </div>
              </section>
            )}

            <section style={{ borderTop: "1px solid #ddd6cc", paddingTop: 26 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "0.2em", color: "#6b6259" }}>CONFIDENTIALITY &amp; DISCLAIMER</p>
              <p style={{ margin: "14px 0 0", fontSize: 13, lineHeight: 1.75, color: "#574f47" }}>
                This memorandum is provided for the sole purpose of evaluating a possible purchase of the property described and is intended only for the
                recipient. The address and member information are withheld until a showing is scheduled, out of respect for the people currently living in
                the house. Occupancy and room-rate figures are pulled from the property&apos;s live PadSplit listing daily and reflect conditions as of the
                last refresh; income and expense figures are supplied by the seller, are unaudited, and are not a representation of future performance. A
                buyer should conduct independent due diligence. This is not an offer to sell or a solicitation of an offer to buy. Caitlyn Verdugo, licensed
                real estate agent in Georgia, Keller Williams Metro Atlanta. Each office independently owned and operated. Equal Housing Opportunity.
              </p>
            </section>

            <footer style={{ borderTop: "1px solid #ddd6cc", paddingTop: 26, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 500, fontSize: 15, color: "#211c19" }}>Caitlyn Verdugo · Keller Williams Metro Atlanta</p>
                <p style={{ margin: "7px 0 0", fontSize: 13, color: "#574f47" }}>
                  101 W Ponce de Leon, Decatur, GA 30030 · <a href={OWNER_PHONE_HREF}>(678) 884-8494</a>
                </p>
              </div>
            </footer>
          </div>
        </div>

        <MobileActionBar priceLabel={formatCurrency(listing.list_price) ?? ""} occupancyLabel={hasOccupancy ? `${liveOccupied} of ${liveTotal} occupied · ${liveTotal} rooms` : ""} />
      </div>
    </UnlockedProvider>
  );
}
