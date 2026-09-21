import Link from "next/link";
import type { Metadata } from "next";
import { getPublicListingsIndex } from "@/lib/listings/public-data";
import { listingsQueryString } from "@/lib/listings/public-index";
import { CAITLYN_HEADSHOT_SRC } from "@/lib/brand/caitlyn";
import { ListingsIndexHeader } from "@/components/listings/index/ListingsIndexHeader";
import { ListingsViewToggle } from "@/components/listings/index/ListingsViewToggle";
import { BookCallButton, PublicSheetsProvider, SellerAnalysisButton } from "@/components/listings/om/PublicSheets";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Available Listings",
  description: "Caitlyn Verdugo with KW Metro Atl",
};

export default async function PublicListingsOverviewPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = searchParams ? await searchParams : {};
  const search = listingsQueryString(raw);
  const { available, underContract, sold } = await getPublicListingsIndex();

  return (
    <PublicSheetsProvider>
    <div className="om-page" style={{ fontFamily: "var(--font-om-sans), Archivo, ui-sans-serif, system-ui, sans-serif", background: "#f4f1ec", color: "#211c19", minHeight: "100dvh", overflowX: "clip" }}>
      <ListingsIndexHeader />

      <div className="om-gutter listings-hero" style={{ background: "#211c19", color: "#f4f1ec", padding: "0 28px 62px" }}>
        <div className="listings-hero-inner" style={{ margin: "0 auto", maxWidth: 1180, paddingTop: 56, display: "flex", alignItems: "flex-end", gap: 48, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 420px", minWidth: 0 }}>
            <p className="listings-hero-eye" style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "0.2em", color: "#e9a396" }}>CALLCAITLYN LISTINGS · METRO ATLANTA</p>
            <h1 className="listings-h1" style={{ margin: "18px 0 0", fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 60, lineHeight: 1.02, color: "#f4f1ec", maxWidth: "16ch" }}>
              Coliving offerings, and everything else on the board.
            </h1>
            <p className="listings-hero-copy listings-hero-copy-full" style={{ margin: "20px 0 0", fontSize: 17, lineHeight: 1.7, color: "#b3aaa0", maxWidth: "62ch" }}>
              Click on the card to view each listing. Occupancy and room rates on the coliving offerings pull live from PadSplit, daily. Underwriting unlocks on
              each offering page.
            </p>
            <p className="listings-hero-copy listings-hero-copy-mobile" style={{ margin: "14px 0 0", fontSize: 15, lineHeight: 1.65, color: "#b3aaa0" }}>
              Occupancy and room rates pull live from PadSplit, daily. Underwriting unlocks on each offering page.
            </p>
            <div className="listings-hero-byline">
              <div
                style={{
                  flex: "0 0 44px",
                  width: 44,
                  height: 44,
                  overflow: "hidden",
                  backgroundImage: `url(${CAITLYN_HEADSHOT_SRC})`,
                  backgroundSize: "155%",
                  backgroundPosition: "center 14%",
                  backgroundRepeat: "no-repeat",
                }}
              />
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 500, letterSpacing: "0.16em", color: "#f4f1ec" }}>CAITLYN VERDUGO | REALTOR</p>
                <p style={{ margin: "5px 0 0", fontSize: 11, fontWeight: 500, letterSpacing: "0.16em", color: "#a39a8e" }}>KELLER WILLIAMS METRO ATLANTA</p>
              </div>
            </div>
          </div>
          <div className="listings-hero-shot" style={{ flex: "0 0 auto", width: 260, maxWidth: "100%" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={CAITLYN_HEADSHOT_SRC} alt="Caitlyn Verdugo" style={{ display: "block", width: "100%", aspectRatio: "4 / 5", objectFit: "cover" }} />
            <p style={{ margin: "14px 0 0", fontSize: 12, fontWeight: 500, letterSpacing: "0.16em", color: "#f4f1ec" }}>CAITLYN VERDUGO | REALTOR</p>
            <p style={{ margin: "6px 0 0", fontSize: 12, fontWeight: 500, letterSpacing: "0.16em", color: "#a39a8e" }}>KELLER WILLIAMS METRO ATLANTA</p>
          </div>
        </div>
      </div>

      <div className="om-gutter listings-main" style={{ margin: "0 auto", maxWidth: 1180, padding: "0 28px 96px" }}>
        <section id="listings" style={{ paddingTop: 64 }}>
          <div className="om-section-head listings-available-head" style={{ display: "flex", alignItems: "baseline", gap: 16, borderBottom: "1px solid #211c19", paddingBottom: 12, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 32, lineHeight: 1, color: "#211c19" }}>Available listings</h2>
            <div className="listings-live-inline" style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: "#cc4a37", boxShadow: "0 0 0 3px rgba(204,74,55,0.18)" }} />
              <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "0.14em", color: "#a33a29" }}>COLIVING OCCUPANCY LIVE FROM PADSPLIT</p>
            </div>
            <p className="listings-available-num" style={{ margin: "0 0 0 auto", fontSize: 12, letterSpacing: "0.1em", color: "#6b6259" }}>01</p>
            <div className="listings-view-toggle">
              <ListingsViewToggle active="list" search={search} />
            </div>
          </div>
          <div className="listings-live-below">
            <span style={{ width: 6, height: 6, borderRadius: 999, background: "#cc4a37", boxShadow: "0 0 0 3px rgba(204,74,55,0.18)" }} />
            <p style={{ margin: 0, fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", color: "#a33a29" }}>OCCUPANCY LIVE FROM PADSPLIT</p>
          </div>

          {available.length === 0 ? (
            <p style={{ marginTop: 48, textAlign: "center", fontSize: 14, color: "#a39a8e" }}>No listings available right now.</p>
          ) : (
            <div className="listings-grid" style={{ marginTop: 26, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
              {available.map((listing) => {
                const body = (
                  <>
                    <div
                      className="listings-card-photo"
                      style={{
                        position: "relative",
                        aspectRatio: "4 / 3",
                        background: listing.coverPhotoUrl
                          ? "#ece6dd"
                          : "#ece6dd repeating-linear-gradient(135deg, #e4ddd2 0 7px, #ece6dd 7px 14px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {listing.coverPhotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={listing.coverPhotoUrl} alt={listing.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span
                          style={{
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                            fontSize: 11,
                            letterSpacing: "0.08em",
                            color: "#8c8378",
                            background: "#f4f1ec",
                            padding: "5px 9px",
                          }}
                        >
                          {listing.photoCaption}
                        </span>
                      )}
                      {listing.tag && (
                        <span
                          className="listings-tag"
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            background: listing.tagColor,
                            color: "#f4f1ec",
                            fontSize: 11,
                            fontWeight: 500,
                            letterSpacing: "0.14em",
                            padding: "7px 11px",
                          }}
                        >
                          {listing.tag}
                        </span>
                      )}
                    </div>
                    <div className="listings-card-body" style={{ padding: "20px 20px 22px", display: "flex", flexDirection: "column", gap: 14, flex: 1, minWidth: 0 }}>
                      <div>
                        {listing.submarketLabel && (
                          <p className="listings-submarket" style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "0.16em", color: "#a33a29" }}>{listing.submarketLabel}</p>
                        )}
                        <p
                          className="listings-card-name"
                          style={{
                            margin: listing.submarketLabel ? "9px 0 0" : 0,
                            fontFamily: "var(--font-om-serif)",
                            fontWeight: 600,
                            fontSize: 26,
                            lineHeight: 1.15,
                            color: "#211c19",
                          }}
                        >
                          {listing.name}
                        </p>
                      </div>
                      {listing.spec ? <p className="listings-card-spec" style={{ margin: "8px 0 0", fontSize: 12, color: "#574f47" }}>{listing.spec}</p> : null}
                      <p className="listings-card-price-desktop" style={{ margin: 0, fontFamily: "var(--font-om-serif)", fontSize: 30, lineHeight: 1, color: "#211c19", borderTop: "1px solid #e4ddd2", paddingTop: 14 }}>
                        {listing.priceLabel}
                      </p>
                      <p className="listings-card-price-mobile" style={{ margin: "10px 0 0", fontFamily: "var(--font-om-serif)", fontSize: 24, lineHeight: 1, color: "#211c19" }}>
                        {listing.priceLabel}
                      </p>
                      {listing.cta && (
                        <p className="listings-card-cta" style={{ margin: "auto 0 0", paddingTop: 6, fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", color: "#a33a29" }}>{listing.cta}</p>
                      )}
                    </div>
                  </>
                );

                const cardStyle = {
                  display: "flex",
                  flexDirection: "column" as const,
                  background: "#fffdfa",
                  border: "1px solid #e4ddd2",
                  borderTop: "2px solid #211c19",
                  color: "inherit",
                };

                if (!listing.href) {
                  return (
                    <div key={listing.id} className="listings-card-plain" style={cardStyle}>
                      {body}
                    </div>
                  );
                }

                if (listing.external) {
                  return (
                    <a key={listing.id} href={listing.href} target="_blank" rel="noopener" className="listings-card" style={cardStyle}>
                      {body}
                    </a>
                  );
                }

                return (
                  <Link key={listing.id} href={listing.href} className="listings-card" style={cardStyle}>
                    {body}
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {underContract.length > 0 && (
          <section id="under-contract" className="listings-phone-hide" style={{ paddingTop: 72 }}>
            <div className="om-section-head" style={{ display: "flex", alignItems: "baseline", gap: 16, borderBottom: "1px solid #211c19", paddingBottom: 12, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 32, lineHeight: 1, color: "#211c19" }}>Under contract</h2>
              <p style={{ margin: "0 0 0 auto", fontSize: 12, letterSpacing: "0.1em", color: "#6b6259" }}>02</p>
            </div>
            <p style={{ margin: "18px 0 0", fontSize: 14, lineHeight: 1.7, color: "#574f47", maxWidth: "70ch" }}>
              Spoken for, but not closed. Worth a call if you want to be first in line should one fall through.
            </p>
            <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
              {underContract.map((listing) => (
                <div
                  key={listing.id}
                  style={{ display: "flex", alignItems: "center", gap: 20, background: "#fffdfa", border: "1px solid #e4ddd2", padding: "16px 20px", flexWrap: "wrap" }}
                >
                  {listing.tag && (
                    <span style={{ background: "#211c19", color: "#f4f1ec", fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", padding: "7px 11px", whiteSpace: "nowrap" }}>
                      {listing.tag}
                    </span>
                  )}
                  <div style={{ minWidth: 200, flex: 1 }}>
                    {listing.submarketLabel && (
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "0.16em", color: "#a33a29" }}>{listing.submarketLabel}</p>
                    )}
                    <p style={{ margin: listing.submarketLabel ? "8px 0 0" : 0, fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 21, lineHeight: 1.2, color: "#211c19" }}>
                      {listing.name}
                    </p>
                    {listing.detail && <p style={{ margin: "7px 0 0", fontSize: 13, color: "#574f47" }}>{listing.detail}</p>}
                  </div>
                  <p style={{ margin: "0 0 0 auto", fontFamily: "var(--font-om-serif)", fontSize: 26, lineHeight: 1, color: "#6b6259" }}>{listing.priceLabel}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {sold.length > 0 && (
          <section id="sold" className="listings-phone-hide" style={{ paddingTop: 72 }}>
            <div style={{ background: "#211c19", color: "#f4f1ec", padding: "34px 32px 36px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 16, borderBottom: "1px solid #3a322c", paddingBottom: 14, flexWrap: "wrap" }}>
                <h2 style={{ margin: 0, fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 28, lineHeight: 1, color: "#f4f1ec" }}>Recently sold</h2>
                <p style={{ margin: "0 0 0 auto", fontSize: 12, letterSpacing: "0.1em", color: "#a39a8e" }}>03</p>
              </div>
              <div style={{ marginTop: 26, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 1, background: "#3a322c" }}>
                {sold.map((entry) => (
                  <div key={entry.id} style={{ background: "#211c19", padding: "4px 22px 6px 0" }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "0.16em", color: "#a39a8e" }}>{entry.closed}</p>
                    <p style={{ margin: "10px 0 0", fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 21, lineHeight: 1.2, color: "#f4f1ec" }}>{entry.name}</p>
                    {entry.detail && <p style={{ margin: "9px 0 0", fontSize: 13, color: "#b3aaa0" }}>{entry.detail}</p>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="listings-mobile-only listings-seller" style={{ marginTop: 40, background: "#211c19", color: "#f4f1ec", padding: "26px 18px 28px" }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 500, letterSpacing: "0.2em", color: "#e9a396" }}>FOR PADSPLIT OWNERS</p>
          <h2 style={{ margin: "14px 0 0", fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 25, lineHeight: 1.16, color: "#f4f1ec" }}>What would your PadSplit sell for?</h2>
          <p style={{ margin: "12px 0 0", fontSize: 15, lineHeight: 1.7, color: "#d6cfc5" }}>
            A coliving house gets priced with a combination of local comps and the income the asset produces. Get an idea of what yours could sell for here.
          </p>
          <SellerAnalysisButton
            className="om-hover-fill-border"
            style={{ marginTop: 20, width: "100%", border: "1px solid #cc4a37", background: "#cc4a37", padding: "15px 18px", fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", color: "#fff" }}
          >
            REQUEST AN ANALYSIS
          </SellerAnalysisButton>
        </section>

        <section id="contact" style={{ paddingTop: 72 }}>
          <div className="listings-contact" style={{ borderTop: "2px solid #211c19", paddingTop: 26, display: "flex", gap: 40, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div className="listings-contact-copy" style={{ flex: 1, minWidth: 280 }}>
              <p className="listings-contact-eye" style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "0.2em", color: "#a33a29" }}>WHO YOU&apos;RE WORKING WITH</p>
              <p className="listings-contact-title" style={{ margin: "16px 0 0", fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 30, lineHeight: 1.25, color: "#211c19", maxWidth: "20ch" }}>
                Caitlyn Verdugo, Keller Williams Metro Atlanta
              </p>
              <p className="listings-contact-body" style={{ margin: "14px 0 0", fontSize: 15, lineHeight: 1.7, color: "#574f47", maxWidth: "56ch" }}>
                I own and operate coliving houses in Atlanta myself, and I underwrite every offering here the same way I underwrite my own. Questions get
                answered before you write anything.
              </p>
            </div>
            <div className="listings-contact-actions" style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 230 }}>
              <BookCallButton
                className="listings-book-primary"
                style={{ display: "block", background: "#211c19", color: "#f4f1ec", textAlign: "center", padding: "15px 22px", fontSize: 13, fontWeight: 600, letterSpacing: "0.12em", border: "1px solid #211c19" }}
              >
                BOOK A CALL
              </BookCallButton>
              <a
                href="tel:+16788848494"
                className="listings-book-secondary"
                style={{ display: "block", border: "1px solid #211c19", color: "#211c19", textAlign: "center", padding: "15px 22px", fontSize: 13, fontWeight: 600, letterSpacing: "0.12em" }}
              >
                (678) 884-8494
              </a>
              <p className="listings-email-desktop" style={{ margin: "6px 0 0", fontSize: 13, color: "#6b6259", textAlign: "center" }}>cv.sellshomes@gmail.com</p>
              <a className="listings-email-mobile" href="mailto:cv.sellshomes@gmail.com" style={{ display: "block", marginTop: 6, fontSize: 13, color: "#6b6259", textAlign: "center" }}>
                cv.sellshomes@gmail.com
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
    </PublicSheetsProvider>
  );
}
