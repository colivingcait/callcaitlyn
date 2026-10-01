import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isPubliclyListed, parsePublicCategory } from "./public-category";
import { listingsQueryString, partitionPublicListings, sortPublicListings, toPublicIndexCard } from "./public-index";
import { publicSoldDetail, publicSoldClosedLabel, toPublicSoldEntry } from "./public-sold";
import { publicInteriorCoverUrl, publicListingHref, publicListingPrivacy } from "./public-privacy";
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

assert.equal(isPubliclyListed({ status: "active" }), true, "public board is status-gated, not public_slug / marketing-page");
assert.equal(isPubliclyListed({ status: "coming_soon" }), true);
assert.equal(isPubliclyListed({ status: "under_contract" }), true);
assert.equal(isPubliclyListed({ status: "archived" }), false);
assert.equal(isPubliclyListed({ status: "closed" }), false, "legacy closed stays off the public board");
assert.equal(
  publicListingHref({ public_category: "coliving", public_slug: null, zillow_url: "https://zillow.com/x", status: "active" }),
  null,
  "coliving never links to Zillow",
);
assert.equal(publicListingHref({ public_category: "coliving", public_slug: null, zillow_url: null, status: "active" }), null);

assert.deepEqual(publicListingHref({ public_category: "coliving", public_slug: "adair", zillow_url: "https://zillow.com/x", status: "active" }), {
  href: "/listings/adair",
  external: false,
  cta: "VIEW THE OFFERING →",
});
assert.deepEqual(
  publicListingHref({ public_category: "airbnb", public_slug: "grant", zillow_url: "https://www.zillow.com/homedetails/1", status: "active" }),
  {
    href: "https://www.zillow.com/homedetails/1",
    external: true,
    cta: "VIEW ON ZILLOW ↗",
  },
);
assert.deepEqual(
  publicListingHref({ public_category: "primary_residence", public_slug: null, zillow_url: "https://www.firstmls.com/x", status: "active" }),
  {
    href: "https://www.firstmls.com/x",
    external: true,
    cta: "VIEW ON FMLS ↗",
  },
);
assert.equal(publicListingHref({ public_category: "airbnb", public_slug: null, zillow_url: null, status: "active" }), null, "no dead links");
assert.equal(
  publicListingHref({
    public_category: "airbnb",
    public_slug: "grant",
    zillow_url: "https://www.zillow.com/homedetails/975-Welch-St",
    status: "archived",
  })?.href,
  "/listings/grant",
  "off-market keeps the internal page and drops Zillow",
);

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

assert.equal(publicSoldDetail({ property_type: "co_living", side: "buyer", on_fmls: true }), "coliving · buyer side");
assert.equal(publicSoldDetail({ property_type: "investment", side: "seller", on_fmls: false }), "Investment · listing side · off-market");
assert.equal(publicSoldClosedLabel("2026-07-12T00:00:00.000Z"), "CLOSED JUL 2026");

const sold = toPublicSoldEntry(
  {
    id: "d1",
    property_type: "co_living",
    side: "seller",
    on_fmls: true,
    closed_at: "2026-04-02T00:00:00.000Z",
  },
  { nickname: "400 Capitol View Ave SW", submarket: "Capitol View" },
);
assert.equal(JSON.stringify(sold).includes("400"), false);
assert.equal(JSON.stringify(sold).includes("Capitol View Ave"), false);
assert.equal(sold.name, "Capitol View");
assert.equal(sold.locationLabel, "Capitol View");
assert.equal(sold.name.toLowerCase().includes("client"), false);
assert.equal(JSON.stringify(sold).includes("client_name"), false);

const streetSold = toPublicSoldEntry(
  {
    id: "d2",
    property_type: "primary_residence",
    side: "buyer",
    on_fmls: false,
    closed_at: "2026-08-01T00:00:00.000Z",
  },
  { nickname: "Waterlace Way", submarket: null },
);
assert.equal(JSON.stringify(streetSold).toLowerCase().includes("waterlace"), false);
assert.equal(streetSold.name, "Atlanta metro");
assert.equal(streetSold.locationLabel, "Atlanta metro");

const cardSource = {
  id: "1",
  nickname: "The Adair",
  property_type: "Legal duplex",
  public_category: "coliving",
  public_slug: "the-adair",
  zillow_url: null,
  submarket: "East Point",
  list_price: 525000,
  status: "active" as const,
  created_at: "2026-09-01T00:00:00Z",
  coverPhotoUrl: null,
  liveOccupied: 6,
  liveTotal: 7,
  beds: 7,
  baths: 4,
  sqft: 2400,
};
const card = toPublicIndexCard(cardSource);
assert.equal(card.tag, "COLIVING");
assert.equal(card.tagColor, "#cc4a37");
assert.equal(card.href, "/listings/the-adair");
assert.equal(card.showMapPin, false, "coliving is private even when active with a slug");
assert.equal(card.lat, null);
assert.equal(card.lng, null);
assert.equal(card.detail, "7 rooms · 6 of 7 occupied");
assert.equal(card.name, "The Adair");
assert.equal(card.submarketLabel, "EAST POINT");

const noSlugCard = toPublicIndexCard({
  ...cardSource,
  public_slug: null,
  zillow_url: null,
});
assert.equal(noSlugCard.href, null, "no slug and no Zillow → still a card, no dead link");
assert.equal(noSlugCard.name, "The Adair");

const zillowFallback = toPublicIndexCard({
  ...cardSource,
  public_category: "primary_residence",
  public_slug: null,
  nickname: "975 Welch St",
  submarket: "Pittsburgh",
  zillow_url: "https://www.zillow.com/homedetails/975-Welch-St-SW-Atlanta-GA-30310/69346676_zpid/",
  status: "active",
});
assert.equal(zillowFallback.href, "https://www.zillow.com/homedetails/975-Welch-St-SW-Atlanta-GA-30310/69346676_zpid/");
assert.equal(zillowFallback.external, true);
assert.equal(zillowFallback.name, "975 Welch St");
assert.equal(zillowFallback.showMapPin, true);
assert.equal(zillowFallback.lat, 33.73);

const privateStreet = toPublicIndexCard({
  ...cardSource,
  nickname: "654 Gillette Ave",
  submarket: null,
  zillow_url: "https://www.zillow.com/homedetails/654-Gillette-Ave-SW-Atlanta-GA-30310/1_zpid/",
  status: "active",
});
assert.equal(privateStreet.name, "Atlanta metro");
assert.equal(privateStreet.submarketLabel, "ATLANTA METRO");
assert.equal(privateStreet.href, "/listings/the-adair");
assert.equal(privateStreet.showMapPin, false);
assert.equal(JSON.stringify(privateStreet).includes("Gillette"), false);
assert.equal(JSON.stringify(privateStreet).includes("30310"), false);
assert.equal(JSON.stringify(privateStreet).includes("zillow"), false);
assert.equal(privateStreet.lat, null);

const privateOffMarket = publicListingPrivacy({
  nickname: "1410 Willow Bend",
  submarket: "Snellville",
  public_category: "primary_residence",
  status: "archived",
  zillow_url: "https://www.zillow.com/homedetails/1410-Willow-Bend-Dr/1_zpid/",
});
assert.equal(privateOffMarket.showAddress, false);
assert.equal(privateOffMarket.showZillow, false);
assert.equal(privateOffMarket.showMapPin, false);
assert.equal(privateOffMarket.displayTitle, "Snellville");
assert.equal(JSON.stringify(privateOffMarket).toLowerCase().includes("willow"), false);

assert.equal(
  publicInteriorCoverUrl([
    { url: "https://cdn.example/front.jpg", category: "exterior" },
    { url: "https://cdn.example/kitchen.jpg", category: "kitchen" },
  ]),
  "https://cdn.example/kitchen.jpg",
);
assert.equal(publicInteriorCoverUrl([{ url: "https://cdn.example/facade.png", category: null }]), null);

assert.equal(listingsQueryString({ view: "map", foo: "bar" }), "foo=bar");

const indexPage = read("app/listing/page.tsx");
assert.ok(indexPage.includes('export const dynamic = "force-dynamic"'));
assert.ok(indexPage.includes("!listing.href"), "cards without a slug/Zillow still render, no dead link");
assert.equal(indexPage.includes("geocode"), false);
assert.equal(indexPage.includes("listing.address"), false);

const mapPage = read("app/listing/map/page.tsx");
assert.ok(mapPage.includes('export const dynamic = "force-dynamic"'));
assert.ok(mapPage.includes("available"), "map uses the available partition only");
assert.ok(mapPage.includes("showMapPin"), "private listings are omitted before the map client");
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
assert.ok(publicData.includes("isPubliclyListed"), "index still status-gates via isPubliclyListed");
assert.ok(publicData.includes('.neq("status", "archived")'));
assert.ok(publicData.includes('.eq("status", "archived")'), "sold nicknames may still match archived listings");
assert.equal(publicData.includes('.eq("status", "closed")'), false);
assert.equal(publicData.includes("client_name"), false);

const category = read("lib/listings/public-category.ts");
assert.ok(category.includes("isPublicAvailableStatus"));
assert.ok(category.includes("isPublicUnderContractStatus"));
assert.equal(category.includes("listing.public_slug) return true"), false, "public_slug is not a board gate");
assert.ok(read("lib/listings/public-privacy.ts").includes("listing.zillow_url"), "Zillow links go through the privacy helper");

const toggle = read("components/listings/PublicPageToggle.tsx");
assert.ok(toggle.includes("already appear on the public board"));
assert.ok(toggle.includes("does") && toggle.includes("not hide them"));

const viewToggle = read("components/listings/index/ListingsViewToggle.tsx");
assert.ok(viewToggle.includes("#sold"), "sold stays reachable from the list/map row");
assert.equal(read("app/listing/page.tsx").includes("ListingsIndexHeader"), false);
assert.equal(read("app/listing/map/page.tsx").includes("ListingsIndexHeader"), false);
assert.ok(read("app/listing/page.tsx").includes("LISTINGS · ATLANTA METRO"), "listings eyebrow drops the CallCaitlyn brand");
assert.equal(read("app/listing/page.tsx").includes("CALLCAITLYN"), false);
assert.equal(read("app/not-found.tsx").includes("CallCaitlyn"), false);
assert.ok(read("app/not-found.tsx").includes("Coliving Cait"));

console.log("public-index proof: ok");
