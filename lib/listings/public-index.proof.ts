import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isPubliclyListed, parsePublicCategory, publicListingHref } from "./public-category";
import { listingsQueryString, partitionPublicListings, sortPublicListings, toPublicIndexCard } from "./public-index";
import { publicSoldNickname, publicSoldDetail, publicSoldClosedLabel, toPublicSoldEntry } from "./public-sold";
import { submarketCentroid } from "./submarkets";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

assert.equal(parsePublicCategory("coliving"), "coliving");
assert.equal(parsePublicCategory("airbnb"), "airbnb");
assert.equal(parsePublicCategory("Co-living"), null, "do not infer the public tag from free text");
assert.equal(parsePublicCategory("co_living"), null);
assert.equal(parsePublicCategory("Legal duplex"), null);

assert.equal(isPubliclyListed({ status: "active", public_slug: "adair", public_category: "coliving", zillow_url: null }), true);
assert.equal(isPubliclyListed({ status: "active", public_slug: null, public_category: "airbnb", zillow_url: "https://zillow.com/x" }), true);
assert.equal(isPubliclyListed({ status: "active", public_slug: null, public_category: "coliving", zillow_url: null }), false);
assert.equal(isPubliclyListed({ status: "archived", public_slug: "x", public_category: "coliving", zillow_url: null }), false);
assert.equal(isPubliclyListed({ status: "under_contract", public_slug: "x", public_category: "coliving", zillow_url: null }), true);

assert.deepEqual(publicListingHref({ public_category: "coliving", public_slug: "adair", zillow_url: "https://zillow.com/x" }), {
  href: "/listing/adair",
  external: false,
  cta: "VIEW THE OFFERING →",
});
assert.deepEqual(publicListingHref({ public_category: "airbnb", public_slug: "grant", zillow_url: "https://www.zillow.com/homedetails/1" }), {
  href: "https://www.zillow.com/homedetails/1",
  external: true,
  cta: "VIEW ON ZILLOW ↗",
});
assert.deepEqual(publicListingHref({ public_category: "primary_residence", public_slug: null, zillow_url: "https://www.firstmls.com/x" }), {
  href: "https://www.firstmls.com/x",
  external: true,
  cta: "VIEW ON FMLS ↗",
});
assert.equal(publicListingHref({ public_category: "airbnb", public_slug: null, zillow_url: null }), null, "no dead links");

const sorted = sortPublicListings([
  { public_category: "airbnb", created_at: "2026-09-20T00:00:00Z" },
  { public_category: "coliving", created_at: "2026-09-10T00:00:00Z" },
  { public_category: "coliving", created_at: "2026-09-18T00:00:00Z" },
  { public_category: "primary_residence", created_at: "2026-09-21T00:00:00Z" },
]);
assert.deepEqual(
  sorted.map((l) => l.public_category + ":" + l.created_at.slice(8, 10)),
  ["coliving:18", "coliving:10", "primary_residence:21", "airbnb:20"],
);

const { available, underContract } = partitionPublicListings([
  { status: "active" as const },
  { status: "coming_soon" as const },
  { status: "under_contract" as const },
  { status: "archived" as const },
]);
assert.equal(available.length, 2);
assert.equal(underContract.length, 1);
assert.equal(available.some((l) => l.status === "archived"), false);
assert.equal(underContract.some((l) => l.status === "archived"), false);
assert.deepEqual(available.map((l) => l.status), ["active", "coming_soon"]);

assert.deepEqual(submarketCentroid("EAST POINT"), { lat: 33.6795, lng: -84.4394 });
assert.deepEqual(submarketCentroid("West Atlanta / Westview"), { lat: 33.754, lng: -84.465 });
assert.equal(submarketCentroid("123 Benjamin E. Mays Dr"), null, "never geocode a street address");
assert.equal(submarketCentroid(null), null);

assert.equal(publicSoldNickname("123 Benjamin E. Mays Dr SW, Atlanta, GA", null), "Benjamin E. Mays Dr SW");
assert.equal(publicSoldNickname("123 Benjamin E. Mays Dr", "Capitol View"), "Capitol View");
assert.equal(publicSoldNickname(null, null), null);
assert.equal(publicSoldNickname("12", null), null);
assert.equal(publicSoldDetail({ property_type: "co_living", side: "buyer", on_fmls: true }), "coliving · buyer side");
assert.equal(publicSoldDetail({ property_type: "investment", side: "seller", on_fmls: false }), "Investment · listing side · off-market");
assert.equal(publicSoldClosedLabel("2026-07-12T00:00:00.000Z"), "CLOSED JUL 2026");

const sold = toPublicSoldEntry({
  id: "d1",
  address: "400 Capitol View Ave SW, Atlanta, GA",
  property_type: "co_living",
  side: "seller",
  on_fmls: true,
  closed_at: "2026-04-02T00:00:00.000Z",
});
assert.equal(sold?.name.includes("400"), false);
assert.equal(sold?.name.toLowerCase().includes("client"), false);
assert.equal(JSON.stringify(sold).includes("client_name"), false);

const card = toPublicIndexCard({
  id: "1",
  nickname: "The Adair",
  property_type: "Legal duplex",
  public_category: "coliving",
  public_slug: "the-adair",
  zillow_url: null,
  submarket: "East Point",
  list_price: 525000,
  status: "active",
  created_at: "2026-09-01T00:00:00Z",
  coverPhotoUrl: null,
  liveOccupied: 6,
  liveTotal: 7,
  beds: 7,
  baths: 4,
  sqft: 2400,
});
assert.equal(card.tag, "COLIVING");
assert.equal(card.tagColor, "#cc4a37");
assert.equal(card.href, "/listing/the-adair");
assert.equal(card.lat, 33.6795);
assert.equal(card.detail, "7 rooms · 6 of 7 occupied");
assert.equal(card.name, "The Adair");

assert.equal(listingsQueryString({ view: "map", foo: "bar" }), "foo=bar");

const indexPage = read("app/listing/page.tsx");
assert.ok(indexPage.includes('export const dynamic = "force-dynamic"'));
assert.equal(indexPage.includes("geocode"), false);
assert.equal(indexPage.includes("listing.address"), false);

const mapPage = read("app/listing/map/page.tsx");
assert.ok(mapPage.includes('export const dynamic = "force-dynamic"'));
assert.ok(mapPage.includes("available"), "map uses the available partition only");
assert.equal(mapPage.includes("underContract"), false);
assert.equal(mapPage.includes("geocode"), false);

const listingLayout = read("app/listing/layout.tsx");
assert.ok(listingLayout.includes("leaflet/dist/leaflet.css"));

const mapCanvas = read("components/listings/index/ListingsMapCanvas.tsx");
assert.ok(mapCanvas.includes("leaflet"));
assert.ok(mapCanvas.includes("openstreetmap.de"));
assert.ok(mapCanvas.includes("OpenStreetMap"));
assert.ok(mapCanvas.includes("scrollWheelZoom: false"));
assert.ok(mapCanvas.includes("fitBounds"));
assert.ok(mapCanvas.includes("requestAnimationFrame"));
assert.equal(mapCanvas.includes("listing.address"), false);
assert.equal(mapCanvas.includes("geocode"), false);

const publicData = read("lib/listings/public-data.ts");
assert.ok(publicData.includes("getRecentlySoldPublic"));
assert.ok(publicData.includes("sortPublicListings"));
assert.ok(publicData.includes('.neq("status", "archived")'));
assert.ok(publicData.includes('.eq("status", "archived")'), "sold nicknames may still match archived listings");
assert.equal(publicData.includes('.eq("status", "closed")'), false);
assert.equal(publicData.includes("client_name"), false);

const header = read("components/listings/index/ListingsIndexHeader.tsx");
assert.ok(header.includes("BOOK A CALL"));
assert.ok(header.includes("/book"));

console.log("public-index proof: ok");
