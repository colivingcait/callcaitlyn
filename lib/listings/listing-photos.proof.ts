import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  hasCuratedPadsplitGallery,
  importablePadsplitPhotos,
  listingCoverPhotoUrl,
  listingPhotoSource,
  listingPublicPhotos,
  visiblePadsplitPhotos,
} from "./padsplit-photos";

// Public OM photo source + curated PadSplit snapshot. Run with:
//   npx tsx lib/listings/listing-photos.proof.ts

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const live = {
  padsplit_photos: [
    { url: "https://cdn.example/front.jpg", category: "front" },
    { url: "https://cdn.example/kitchen.jpg", category: "kitchen" },
    { url: "https://cdn.example/bath.jpg", category: "bathroom" },
  ],
  excluded_photo_urls: [] as string[],
  padsplit_photo_urls: ["https://cdn.example/kitchen.jpg", "https://cdn.example/bath.jpg"],
  padsplit_gallery: null as null,
};

assert.equal(listingPhotoSource(live), "padsplit");
assert.deepEqual(importablePadsplitPhotos(live).map((p) => p.url), ["https://cdn.example/kitchen.jpg", "https://cdn.example/bath.jpg"]);
assert.equal(hasCuratedPadsplitGallery(live), false);
assert.deepEqual(listingPublicPhotos(live, ["https://manual.example/a.jpg"]).map((p) => p.url), [
  "https://cdn.example/kitchen.jpg",
  "https://cdn.example/bath.jpg",
]);

const curated = {
  ...live,
  photo_source: "padsplit" as const,
  hero_photo_url: "https://cdn.example/bath.jpg",
  padsplit_gallery: [
    { url: "https://cdn.example/bath.jpg", category: "bathroom" },
    { url: "https://cdn.example/kitchen.jpg", category: "kitchen" },
  ],
};
assert.equal(hasCuratedPadsplitGallery(curated), true);
assert.deepEqual(listingPublicPhotos(curated).map((p) => p.url), ["https://cdn.example/bath.jpg", "https://cdn.example/kitchen.jpg"]);
assert.equal(listingCoverPhotoUrl(curated), "https://cdn.example/bath.jpg");

const reorderedHeroFirst = {
  ...curated,
  hero_photo_url: "https://cdn.example/kitchen.jpg",
};
assert.deepEqual(
  listingPublicPhotos(reorderedHeroFirst).map((p) => p.url),
  ["https://cdn.example/bath.jpg", "https://cdn.example/kitchen.jpg"],
  "pin must not reorder the public gallery",
);
assert.equal(listingCoverPhotoUrl(reorderedHeroFirst), "https://cdn.example/kitchen.jpg");

const excludedPinned = { ...reorderedHeroFirst, excluded_photo_urls: ["https://cdn.example/kitchen.jpg"] };
assert.equal(listingCoverPhotoUrl(excludedPinned), "https://cdn.example/bath.jpg");
assert.deepEqual(visiblePadsplitPhotos(excludedPinned).map((p) => p.url), ["https://cdn.example/bath.jpg"]);

const scrapeWouldChangeLive = {
  ...curated,
  padsplit_photos: [
    { url: "https://cdn.example/new-first.jpg", category: "kitchen" },
    { url: "https://cdn.example/bath.jpg", category: "bathroom" },
  ],
};
assert.deepEqual(
  listingPublicPhotos(scrapeWouldChangeLive).map((p) => p.url),
  ["https://cdn.example/bath.jpg", "https://cdn.example/kitchen.jpg"],
  "daily scrape cache must not replace a curated gallery",
);

const switchedManual = {
  ...curated,
  photo_source: "manual" as const,
  photo_paths: ["uploads/a.jpg", "uploads/b.jpg"],
};
assert.deepEqual(listingPublicPhotos(switchedManual, ["https://manual.example/a.jpg", "https://manual.example/b.jpg"]).map((p) => p.url), [
  "https://manual.example/a.jpg",
  "https://manual.example/b.jpg",
]);
assert.equal(listingCoverPhotoUrl(switchedManual, ["https://manual.example/a.jpg", "https://manual.example/b.jpg"]), "https://manual.example/a.jpg");
assert.equal(hasCuratedPadsplitGallery(switchedManual), true, "switching source must keep the other store");

const page = read("app/(app)/listings/[id]/page.tsx");
assert.ok(page.includes('key: "photos"'));
assert.ok(page.includes("ListingPhotosPanel"));

const panel = read("components/listings/ListingPhotosPanel.tsx");
assert.ok(panel.includes("PadSplit snapshot"));
assert.ok(panel.includes("My uploads"));
assert.ok(panel.includes("Pull from PadSplit"));
assert.ok(panel.includes("will not replace this gallery"));

const exclude = read("components/listings/PhotoExcludeManager.tsx");
assert.ok(exclude.includes("Set as hero"));
assert.ok(exclude.includes("updatePadsplitGallery"));
assert.ok(exclude.includes("new Set(asUrlList(excludedUrls))"));

const uploader = read("components/listings/PhotoUploader.tsx");
assert.ok(uploader.includes("Set as hero"));
assert.ok(uploader.includes("updateListingPhotoOrder"));

const carousel = read("components/listings/om/PhotoCarousel.tsx");
assert.ok(carousel.includes("coverUrl"));
assert.ok(carousel.includes("photos.find"));
assert.equal(carousel.includes("const cover = photos[0]"), false);

const actions = read("app/(app)/listings/actions.ts");
assert.ok(actions.includes("pullPadsplitGallery"));
assert.ok(actions.includes("updateListingPhotoSource"));
assert.ok(actions.includes("padsplit_gallery"));

const migration = read("supabase/migrations/0078_listing_photo_source.sql");
assert.ok(migration.includes("add column photo_source"));
assert.ok(migration.includes("add column hero_photo_url"));
assert.ok(migration.includes("add column padsplit_gallery"));
assert.ok(migration.includes("check (photo_source in ('manual', 'padsplit'))"));

console.log("listing photos: ok");
