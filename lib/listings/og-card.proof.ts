import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildOgListingCard,
  looksLikeStreetAddress,
  ogHeroPhoto,
  ogHook,
  ogLocationLine,
  ogPlaceName,
  ogShareDescription,
  ogShareTitle,
  ogSpecs,
  ogVersionToken,
  type OgListingSource,
} from "./og-card";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

assert.equal(ogPlaceName(null), "Atlanta metro");
assert.equal(ogPlaceName("  "), "Atlanta metro");
assert.equal(ogPlaceName("Stone Mountain"), "Stone Mountain");
assert.equal(ogPlaceName("Lithonia"), "Lithonia");
assert.equal(ogLocationLine("Gresham Park"), "GRESHAM PARK · ATLANTA METRO");
assert.equal(ogLocationLine(null), "ATLANTA METRO");
assert.equal(ogLocationLine("Atlanta metro"), "ATLANTA METRO");
assert.equal(ogPlaceName("123 Benjamin E. Mays Dr"), "Atlanta metro", "street address is not a submarket");
assert.equal(ogLocationLine("456 Oak Street"), "ATLANTA METRO");
assert.equal(looksLikeStreetAddress("House-hack ready"), false);
assert.equal(ogHook("Bright rooms on 123 Main St today", null), null);
assert.equal(ogHook("House-hack ready", null), "House-hack ready");
assert.equal(ogHook(null, "testing"), null, "placeholder copy stays off the card");

const base: OgListingSource = {
  nickname: "Gresham Park Eight",
  submarket: "Gresham Park",
  status: "active",
  list_price: 425000,
  beds: 8,
  baths: 2.5,
  sqft: 2400,
  story: "House-hack ready",
  public_description: null,
  photos: [
    { url: "https://cdn.example/front.jpg", category: "exterior" },
    { url: "https://cdn.example/kitchen.jpg", category: "kitchen" },
    { url: "https://cdn.example/bed.jpg", category: "bedroom" },
  ],
};

assert.equal(ogHeroPhoto(base.photos)?.url, "https://cdn.example/kitchen.jpg");
assert.equal(
  ogHeroPhoto([
    { url: "https://cdn.example/bath.jpg", category: "bathroom" },
    { url: "https://cdn.example/kitchen.jpg", category: "kitchen" },
  ])?.url,
  "https://cdn.example/bath.jpg",
  "saved order wins over a later kitchen",
);
assert.equal(
  ogHeroPhoto([
    { url: "https://cdn.example/porch.jpg", category: "porch" },
    { url: "https://manual.example/front-yard.jpg", category: null },
  ]),
  null,
);
assert.equal(ogHeroPhoto([{ url: "https://manual.example/living.jpg", category: null }])?.url, "https://manual.example/living.jpg");

const coliving = buildOgListingCard(base);
const offMarket = buildOgListingCard({ ...base, status: "under_contract", nickname: "Off Market House" });
const forSale = buildOgListingCard({ ...base, nickname: "Candace", submarket: "East Point", status: "active" });
assert.equal(coliving.locationLine, "GRESHAM PARK · ATLANTA METRO");
assert.equal(offMarket.locationLine, "GRESHAM PARK · ATLANTA METRO", "off-market still shows the entered submarket");
assert.equal(forSale.locationLine, "EAST POINT · ATLANTA METRO");
assert.equal(coliving.price, "$425,000");
assert.equal(coliving.priceSize, 108);
assert.equal(ogSpecs({ beds: 8, baths: 2.5, sqft: 2400 }), "8 bd · 2.5 ba · 2,400 sqft");
assert.equal(coliving.heroUrl, "https://cdn.example/kitchen.jpg");
assert.equal(ogShareTitle({ nickname: "123 Oak Dr", submarket: "Lithonia" }), "Lithonia | Caitlyn Verdugo, KW Metro Atlanta");
assert.equal(ogShareTitle(base), "Gresham Park Eight | Caitlyn Verdugo, KW Metro Atlanta");
assert.equal(ogShareDescription({ ...base, story: "123 Main Street is the hook" }).includes("123"), false);
assert.equal(coliving.description.includes("Gresham Park"), true);
assert.equal(coliving.description.includes("Mays"), false);

const priced = ogVersionToken({ listPrice: 425000, status: "active", heroUrl: coliving.heroUrl });
assert.equal(ogVersionToken({ listPrice: 425000, status: "active", heroUrl: coliving.heroUrl }), priced);
assert.notEqual(ogVersionToken({ listPrice: 400000, status: "active", heroUrl: coliving.heroUrl }), priced);
assert.notEqual(ogVersionToken({ listPrice: 425000, status: "under_contract", heroUrl: coliving.heroUrl }), priced);
assert.notEqual(ogVersionToken({ listPrice: 425000, status: "active", heroUrl: "https://cdn.example/bed.jpg" }), priced);

for (const rel of ["lib/listings/og-card.ts", "lib/og/listing-og.tsx", "lib/og/listing-metadata.ts", "app/listing/[slug]/opengraph-image.tsx", "app/listing/[slug]/twitter-image.tsx"]) {
  const source = read(rel);
  assert.equal(source.includes(".address"), false, `${rel} must not read a street address`);
  assert.equal(source.includes("financials"), false, `${rel} must not read underwriting`);
  assert.equal(/vera|sidecar|apply/i.test(source), false, `${rel} must not mention internal systems`);
}

const imageRoute = read("app/listing/[slug]/opengraph-image.tsx");
assert.ok(imageRoute.includes("notFound"));
assert.ok(imageRoute.includes("generateImageMetadata"));
assert.ok(read("app/listing/page.tsx").includes("Available Listings | Caitlyn Verdugo, KW Metro Atlanta"));
assert.ok(read("lib/listings/public-data.ts").includes('.neq("status", "archived")'));
assert.ok(read("assets/fonts/Newsreader-Regular.ttf").length > 1000);
assert.ok(read("assets/fonts/Archivo-SemiBold.ttf").length > 1000);

console.log("og-card proof ok");
