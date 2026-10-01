import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { selectIndexOgInteriorUrls, type IndexOgPhotoListing } from "./index-og-photos";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function listing(partial: Partial<IndexOgPhotoListing> & Pick<IndexOgPhotoListing, "id" | "created_at" | "photos">): IndexOgPhotoListing {
  return { status: "active", ...partial };
}

const newestExterior = listing({
  id: "b",
  created_at: "2026-09-20T00:00:00Z",
  photos: [
    { url: "https://cdn.example/front.jpg", category: "exterior" },
    { url: "https://cdn.example/kitchen.jpg", category: "kitchen" },
  ],
});
const olderInterior = listing({
  id: "a",
  created_at: "2026-09-10T00:00:00Z",
  photos: [{ url: "https://cdn.example/bed.jpg", category: "bedroom" }],
});
const onlyExterior = listing({
  id: "c",
  created_at: "2026-09-22T00:00:00Z",
  photos: [{ url: "https://cdn.example/porch.jpg", category: "porch", tags: ["front"] }],
});
const comingSoon = listing({
  id: "d",
  created_at: "2026-09-25T00:00:00Z",
  status: "coming_soon",
  photos: [{ url: "https://cdn.example/soon.jpg", category: "kitchen" }],
});
const underContract = listing({
  id: "e",
  created_at: "2026-09-24T00:00:00Z",
  status: "under_contract",
  photos: [{ url: "https://cdn.example/uc.jpg", category: "living" }],
});
const filenameExterior = listing({
  id: "f",
  created_at: "2026-09-18T00:00:00Z",
  photos: [
    { url: "https://cdn.example/house-front.jpg", category: null },
    { url: "https://cdn.example/living.jpg", category: null },
  ],
});

assert.deepEqual(selectIndexOgInteriorUrls([olderInterior, newestExterior]), [
  "https://cdn.example/kitchen.jpg",
  "https://cdn.example/bed.jpg",
]);
assert.deepEqual(selectIndexOgInteriorUrls([onlyExterior, newestExterior, olderInterior]), [
  "https://cdn.example/kitchen.jpg",
  "https://cdn.example/bed.jpg",
]);
assert.deepEqual(selectIndexOgInteriorUrls([comingSoon, underContract, olderInterior]), [
  "https://cdn.example/bed.jpg",
  null,
]);
assert.deepEqual(selectIndexOgInteriorUrls([filenameExterior]), ["https://cdn.example/living.jpg", null]);
assert.deepEqual(selectIndexOgInteriorUrls([onlyExterior, comingSoon]), [null, null]);

const tied = [
  listing({ id: "m", created_at: "2026-09-01T00:00:00Z", photos: [{ url: "https://cdn.example/m.jpg", category: "kitchen" }] }),
  listing({ id: "k", created_at: "2026-09-01T00:00:00Z", photos: [{ url: "https://cdn.example/k.jpg", category: "kitchen" }] }),
];
assert.deepEqual(selectIndexOgInteriorUrls(tied), ["https://cdn.example/k.jpg", "https://cdn.example/m.jpg"]);

const selector = read("lib/listings/index-og-photos.ts");
assert.equal(selector.includes("address"), false);
assert.equal(selector.includes("ogHeroPhoto"), true);
const loader = read("lib/listings/public-data.ts");
assert.ok(loader.includes("selectIndexOgInteriorUrls"));
const columns = loader.match(/INDEX_OG_PHOTO_COLUMNS =\s*\n\s*"([^"]+)"/);
assert.ok(columns, "index card query lists its columns");
assert.equal(columns[1].includes("address"), false);
assert.equal(columns[1].includes("nickname"), false);
assert.equal(columns[1].includes("zillow"), false);
const image = read("lib/og/listing-og.tsx");
assert.ok(image.includes("photoDataUrl"));
assert.ok(image.includes("getIndexOgInteriorPhotoUrls"));
assert.equal(image.includes("alt=\"\""), true);
const indexCard = image.slice(image.indexOf("function IndexCard"), image.indexOf("function statusPill"));
assert.ok(indexCard.includes("Cormorant Garamond"));
assert.ok(indexCard.includes("DM Sans"));
assert.ok(indexCard.includes("GOLD"));
assert.ok(indexCard.includes("INDEX_CREAM"));
assert.ok(image.includes('const GOLD = "#C4955A"'));
assert.ok(image.includes('const INDEX_CREAM = "#FAF7F2"'));
assert.ok(indexCard.includes("LISTINGS · ATLANTA METRO"));
assert.equal(indexCard.includes("borderRadius"), false);
assert.equal(indexCard.includes("#A8462A"), false);
assert.equal(indexCard.includes("#cc4a37"), false);
assert.ok(image.includes("function ListingCard"));
assert.ok(image.includes("background: TERRACOTTA"));
const fonts = read("lib/og/fonts.ts");
const listingFonts = fonts.slice(fonts.indexOf("async function readOgFonts"), fonts.indexOf("export function loadOgFonts"));
assert.equal(listingFonts.includes("Cormorant"), false);
assert.ok(fonts.includes("CormorantGaramond-Regular.ttf"));
assert.ok(fonts.includes("CormorantGaramond-LightItalic.ttf"));
assert.ok(fonts.includes("DMSans-Light.ttf"));
for (const file of ["CormorantGaramond-Regular.ttf", "CormorantGaramond-LightItalic.ttf", "DMSans-Light.ttf"]) {
  assert.ok(read(`assets/fonts/${file}`).length > 1000, file);
}

console.log("index og photos proof ok");
