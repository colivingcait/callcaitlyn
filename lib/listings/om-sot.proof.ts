import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extractPadsplitListingId, padsplitListingUrlFromInput, PADSPLIT_LISTING_URL_BASE } from "./padsplit-url";
import { isExteriorPadsplitPhoto, interiorPhotos, listingCoverPhotoUrl, listingPhotoSource, listingPublicPhotos } from "./padsplit-photos";
import {
  GATED_RATIO_FIELDS,
  GATED_REMOVED_FIELDS,
  GATED_UNDERWRITING_FIELDS,
  formatMonthlyAverage,
} from "./gated-underwriting";
import { SIDECAR_FIELD_MAP } from "./om-sidecar";

// Locked Marketing/OM SoT: PadSplit ID, exterior photo skip, workbook-only
// upload, process 4-up, monthly gated underwriting. Run with:
//   npx tsx lib/listings/om-sot.proof.ts

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

assert.equal(PADSPLIT_LISTING_URL_BASE, "https://www.padsplit.com/rooms-for-rent/listing");
assert.equal(extractPadsplitListingId("12345"), "12345");
assert.equal(extractPadsplitListingId("https://www.padsplit.com/rooms-for-rent/listing/98765"), "98765");
assert.equal(extractPadsplitListingId("https://www.padsplit.com/rooms-for-rent/listing/98765/westside"), "98765");
assert.equal(extractPadsplitListingId(""), "");
assert.equal(padsplitListingUrlFromInput("8299"), "https://www.padsplit.com/rooms-for-rent/listing/8299");
assert.equal(extractPadsplitListingId("8299"), "8299");
assert.equal(padsplitListingUrlFromInput("https://www.padsplit.com/rooms-for-rent/listing/12345"), "https://www.padsplit.com/rooms-for-rent/listing/12345");
assert.equal(padsplitListingUrlFromInput(""), null);

const basics = read("components/listings/BasicsForm.tsx");
assert.ok(basics.includes("PadSplit listing ID"));
assert.equal(basics.includes("PadSplit listing URL"), false);
assert.ok(basics.includes("padsplitListingUrlFromInput"));
assert.ok(basics.includes("extractPadsplitListingId"));

assert.equal(isExteriorPadsplitPhoto({ url: "https://cdn.example/room.jpg", category: "bedroom" }), false);
assert.equal(isExteriorPadsplitPhoto({ url: "https://cdn.example/x.jpg", category: "EXTERIOR" }), true);
assert.equal(isExteriorPadsplitPhoto({ url: "https://cdn.example/x.jpg", category: "outside" }), true);
assert.equal(isExteriorPadsplitPhoto({ url: "https://cdn.example/curb-appeal.jpg", category: "living" }), true);
assert.equal(isExteriorPadsplitPhoto({ url: "https://cdn.example/kitchen.jpg", category: "kitchen", alt: "front of house" }), true);
assert.equal(isExteriorPadsplitPhoto({ url: "https://cdn.example/facade.png", category: null }), true);
assert.equal(isExteriorPadsplitPhoto({ url: "https://cdn.example/a.jpg", category: "interior", tags: ["exterior"] }), true);

const listing = {
  padsplit_photos: [
    { url: "https://cdn.example/front.jpg", category: "front" },
    { url: "https://cdn.example/kitchen.jpg", category: "kitchen" },
  ],
  excluded_photo_urls: [] as string[],
  padsplit_photo_urls: ["https://cdn.example/front.jpg", "https://cdn.example/kitchen.jpg"],
};
assert.deepEqual(
  interiorPhotos(listing).map((p) => p.url),
  ["https://cdn.example/kitchen.jpg"],
);
assert.equal(listingCoverPhotoUrl(listing, ["https://manual.example/a.jpg"]), "https://cdn.example/kitchen.jpg");
assert.equal(listingPhotoSource(listing), "padsplit");
assert.deepEqual(listingPublicPhotos(listing, ["https://manual.example/a.jpg"]).map((p) => p.url), ["https://cdn.example/kitchen.jpg"]);

const curated = {
  ...listing,
  photo_source: "padsplit" as const,
  hero_photo_url: "https://cdn.example/living.jpg",
  padsplit_gallery: [
    { url: "https://cdn.example/kitchen.jpg", category: "kitchen" },
    { url: "https://cdn.example/living.jpg", category: "living" },
  ],
};
assert.deepEqual(listingPublicPhotos(curated).map((p) => p.url), ["https://cdn.example/kitchen.jpg", "https://cdn.example/living.jpg"]);
assert.equal(listingCoverPhotoUrl(curated), "https://cdn.example/living.jpg");

const excludedHero = { ...curated, excluded_photo_urls: ["https://cdn.example/living.jpg"] };
assert.equal(listingCoverPhotoUrl(excludedHero), "https://cdn.example/kitchen.jpg");

const manual = {
  ...listing,
  photo_source: "manual" as const,
  hero_photo_url: "https://manual.example/b.jpg",
  photo_paths: ["a.jpg", "b.jpg"],
};
assert.deepEqual(listingPublicPhotos(manual, ["https://manual.example/a.jpg", "https://manual.example/b.jpg"]).map((p) => p.url), [
  "https://manual.example/a.jpg",
  "https://manual.example/b.jpg",
]);
assert.equal(listingCoverPhotoUrl(manual, ["https://manual.example/a.jpg", "https://manual.example/b.jpg"]), "https://manual.example/b.jpg");
assert.equal(listingCoverPhotoUrl({ ...manual, hero_photo_url: null }, ["https://manual.example/a.jpg", "https://manual.example/b.jpg"]), "https://manual.example/a.jpg");

const scrape = read("scripts/scrape-padsplit.mjs");
assert.ok(scrape.includes("EXTERIOR_PHOTO_RE"));
assert.ok(scrape.includes("isExteriorPhoto"));
assert.ok(scrape.includes("interiorUrls"));
assert.ok(scrape.includes("padsplit_gallery"), "scrape must document that curated gallery is off-limits");
const scrapeUpdates = [...scrape.matchAll(/\.update\(\{[\s\S]*?\}\)/g)].map((m) => m[0]);
assert.ok(scrapeUpdates.length >= 2);
for (const block of scrapeUpdates) {
  assert.equal(block.includes("padsplit_gallery"), false, "daily scrape must not write padsplit_gallery");
  assert.equal(block.includes("hero_photo_url"), false, "daily scrape must not write hero_photo_url");
  assert.equal(block.includes("photo_source"), false, "daily scrape must not write photo_source");
}

const omPage = read("app/listing/[slug]/page.tsx");
assert.equal(omPage.includes("Process & timeline"), false);
assert.ok(omPage.includes('id="process"'));
assert.ok(omPage.includes("om-process"));
assert.ok(omPage.includes("The process"));
assert.ok(omPage.includes("Review the offering"));
assert.ok(omPage.includes("See it in person during DD"));
assert.equal(omPage.includes("listing.address"), false, "public OM must never render the street address");
assert.equal(omPage.includes("dd_days"), false);
assert.equal(omPage.includes("seller_support"), false);
assert.equal(omPage.includes("finiteDays"), false);
assert.ok(omPage.includes("GROSS RENTS"));
assert.ok(omPage.includes("OPERATING EXPENSES"));
assert.ok(omPage.includes("CASH-ON-CASH"));
assert.ok(omPage.includes("CAP RATE"));
assert.ok(omPage.includes("om-fin"), "financial overview uses card grid, not auto-fit");
assert.equal(omPage.includes("om-fin-overview"), false);
assert.equal(
  /className="om-body"[^>]*alignItems:\s*"start"/.test(omPage),
  false,
  "body grid must stretch so the sticky rail can pin",
);
assert.ok(omPage.includes('alignSelf: "stretch"'));
assert.ok(omPage.includes("UnlockedProvider slug={slug}"));
assert.ok(omPage.includes("PhotoCarousel"));
assert.ok(omPage.includes("VIEW PHOTOS") === false, "VIEW PHOTOS lives on the hero client, not the server page");

const omCss = read("app/listing/om.css");
assert.ok(omCss.includes("#process"));
assert.ok(omCss.includes("om-process"));
assert.ok(omCss.includes(".om-fin"));
assert.ok(omCss.includes("repeat(2, minmax(0, 1fr))"));
assert.equal(omCss.includes("min-width: 520px"), false, "T12 chart must not clip inside the 492px column");

const publicCopy = read("lib/listings/public-copy.ts");
assert.equal(publicCopy.includes("finiteDays"), false);
assert.equal(publicCopy.includes("due-diligence"), false);

const nav = read("components/listings/om/OmHeaderNav.tsx");
assert.ok(nav.includes("#process"));
assert.ok(nav.includes("PROCESS"));
assert.ok(nav.includes("#occupancy"));
assert.ok(nav.indexOf("#property") < nav.indexOf("#occupancy"));
assert.ok(nav.indexOf("#occupancy") < nav.indexOf("#financials"));
assert.ok(nav.includes("SUBMIT AN OFFER"));
assert.ok(nav.includes("UNLOCK FINANCIALS"));

const gate = read("components/listings/om/FinancialGate.tsx");
assert.ok(gate.includes("GATED_UNDERWRITING_FIELDS"));
assert.ok(gate.includes("GATED_RATIO_FIELDS"));
assert.ok(gate.includes("formatMonthlyAverage"));
assert.ok(gate.includes("workbookUrl"));
assert.ok(gate.includes("writeOmUnlock"));
assert.ok(gate.includes("applyUnlock"));
assert.ok(gate.includes("scrollToFinancials") || gate.includes("getElementById(\"financials\")"));
assert.equal(gate.includes("setUnlocked(true)"), false, "unlock must persist payload, not flip a boolean alone");
assert.equal(gate.includes("Financing scenarios"), false);
assert.equal(gate.includes("financials.t12"), false);
assert.equal(gate.includes("PM fees"), false);
assert.equal(gate.includes("Occupancy summary"), false);
assert.equal(gate.includes("texted and emailed"), false);
assert.ok(gate.includes("no inbox trip, no waiting on a reply"));
assert.ok(gate.includes("MONTHLY AVERAGE · TRAILING TWELVE MONTHS"));
assert.ok(gate.includes("Recent capital improvements"));
assert.ok(gate.includes("CapEx"));
assert.ok(gate.includes("Unlock reveals rents, expenses, debt service, CapEx, and the workbook."));
assert.ok(gate.includes("visibleImprovements"));
assert.ok(gate.includes("<CapExCard"));
assert.ok(gate.indexOf("<CapExCard") < gate.indexOf("DOWNLOAD WORKBOOK"), "CapEx card sits before the workbook");
assert.equal(gate.includes("T12METRIC"), false, "do not replace live T12 monthly averages with the mock month-grid");
assert.equal(gate.includes("RESET DEMO"), false);

const omPageGate = read("app/listing/[slug]/page.tsx");
assert.ok(omPageGate.includes("improvements={listing.improvements}"));

const hero = read("components/listings/om/PhotoCarousel.tsx");
assert.ok(hero.includes("VIEW PHOTOS"));
assert.ok(hero.includes("coverUrl"));
assert.ok(hero.includes("photoMode"));
assert.ok(hero.includes("Escape"));
assert.ok(hero.includes("ArrowLeft"));
assert.ok(hero.includes("om-thumbs"));
assert.ok(hero.includes("rgba(33,28,25,0.97)"));
assert.equal(hero.includes("photo.alt"), false, "scrape alt can carry a street address");

assert.deepEqual(
  GATED_UNDERWRITING_FIELDS.map((f) => f.key),
  ["gross_rents", "net_earnings", "opex", "noi", "projected_debt_service", "net_cash_flow"],
);
assert.deepEqual(
  GATED_RATIO_FIELDS.map((f) => f.key),
  ["cash_on_cash", "cap_rate", "dscr"],
);
assert.equal(formatMonthlyAverage("61483.07"), "$5,124");
assert.equal(formatMonthlyAverage("53304.89"), "$4,442");
assert.equal(formatMonthlyAverage("12088.18"), "$1,007");
assert.equal(formatMonthlyAverage("41216.71"), "$3,435");
assert.equal(formatMonthlyAverage("25547.62"), "$2,129");
assert.equal(formatMonthlyAverage("15669.09"), "$1,306");

const unlockCtx = read("components/listings/om/UnlockContext.tsx");
assert.ok(unlockCtx.includes("writeOmUnlock"));
assert.ok(unlockCtx.includes("readOmUnlock"));
assert.ok(unlockCtx.includes("slug"));

assert.deepEqual(
  GATED_UNDERWRITING_FIELDS.map((f) => f.path),
  SIDECAR_FIELD_MAP.gated_ui,
);
assert.deepEqual([...GATED_REMOVED_FIELDS], SIDECAR_FIELD_MAP.gated_removed);

const editor = read("components/listings/FinancialsEditor.tsx");
for (const removed of GATED_REMOVED_FIELDS) {
  assert.equal(editor.includes(removed), false, `Marketing editor must not offer ${removed}`);
  assert.equal(gate.includes(removed), false, `Gated OM must not show ${removed}`);
}

const unlock = read("app/listing/[slug]/actions.ts");
assert.ok(unlock.includes("buyer_workbook"));
assert.ok(unlock.includes("workbookUrl"));
assert.ok(unlock.includes("asListingFinancials"));
assert.ok(unlock.includes("normalizeFinancials(null)"));

console.log("om sot: ok");
