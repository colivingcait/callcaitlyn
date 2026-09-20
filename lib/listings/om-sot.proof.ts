import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extractPadsplitListingId, padsplitListingUrlFromInput, PADSPLIT_LISTING_URL_BASE } from "./padsplit-url";
import { isExteriorPadsplitPhoto, interiorPhotos, listingCoverPhotoUrl } from "./padsplit-photos";
import { GATED_REMOVED_FIELDS, GATED_UNDERWRITING_FIELDS } from "./gated-underwriting";
import { SIDECAR_FIELD_MAP } from "./om-sidecar";

// Locked Marketing/OM SoT: PadSplit ID, exterior photo skip, workbook-only
// upload, no Process card, gated underwriting list. Run with:
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

const scrape = read("scripts/scrape-padsplit.mjs");
assert.ok(scrape.includes("EXTERIOR_PHOTO_RE"));
assert.ok(scrape.includes("isExteriorPhoto"));
assert.ok(scrape.includes("interiorUrls"));

const omPage = read("app/listing/[slug]/page.tsx");
assert.equal(omPage.includes("Process & timeline"), false);
assert.equal(omPage.includes("Process"), false);
assert.equal(omPage.includes('id="process"'), false);
assert.equal(omPage.includes("om-process"), false);
assert.equal(omPage.includes("dd_days"), false);
assert.equal(omPage.includes("seller_support"), false);
assert.equal(omPage.includes("finiteDays"), false);
assert.ok(omPage.includes("GROSS RENTS"));
assert.ok(omPage.includes("OPERATING EXPENSES"));
assert.ok(omPage.includes("CASH-ON-CASH"));
assert.ok(omPage.includes("CAP RATE"));

const omCss = read("app/listing/om.css");
assert.equal(omCss.includes("#process"), false);
assert.equal(omCss.includes("om-process"), false);

const publicCopy = read("lib/listings/public-copy.ts");
assert.equal(publicCopy.includes("finiteDays"), false);
assert.equal(publicCopy.includes("due-diligence"), false);

const nav = read("components/listings/om/OmHeaderNav.tsx");
assert.equal(nav.includes("#process"), false);
assert.equal(nav.includes("PROCESS"), false);

const gate = read("components/listings/om/FinancialGate.tsx");
assert.ok(gate.includes("GATED_UNDERWRITING_FIELDS"));
assert.ok(gate.includes("workbookUrl"));
assert.equal(gate.includes("Financing scenarios"), false);
assert.equal(gate.includes("financials.t12"), false);
assert.equal(gate.includes("PM fees"), false);
assert.equal(gate.includes("Occupancy summary"), false);

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

console.log("om sot: ok");
