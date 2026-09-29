import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { reorderById, revertOrderIfSameMembers, syncIncomingOrder } from "./photo-order";
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

assert.deepEqual(reorderById(["a", "b", "c"], "a", "c"), ["b", "c", "a"]);
assert.deepEqual(reorderById(["a", "b", "c"], "c", "a"), ["c", "a", "b"]);
assert.equal(reorderById(["a", "b"], "a", "a"), null);
assert.equal(reorderById(["a", "b"], "a", null), null);
assert.equal(reorderById(["a", "b"], "missing", "a"), null);

const start = { items: ["a", "b", "c"], seenKey: "a\u0000b\u0000c" };
const optimistic = { items: ["b", "a", "c"], seenKey: "a\u0000b\u0000c" };
assert.equal(syncIncomingOrder(optimistic, ["a", "b", "c"], (id) => id, "b\u0000a\u0000c"), optimistic, "same server props must not wipe an optimistic drag");
const confirmed = syncIncomingOrder(optimistic, ["b", "a", "c"], (id) => id, "b\u0000a\u0000c");
assert.deepEqual(confirmed.items, ["b", "a", "c"]);
assert.equal(confirmed.seenKey, "b\u0000a\u0000c");
const ignored = syncIncomingOrder({ items: ["c", "b", "a"], seenKey: "a\u0000b\u0000c" }, ["b", "a", "c"], (id) => id, "c\u0000b\u0000a");
assert.deepEqual(ignored.items, ["c", "b", "a"], "stale refresh must not snap the grid back");
assert.equal(ignored.seenKey, "b\u0000a\u0000c");
assert.deepEqual(syncIncomingOrder(optimistic, ["a", "b", "c", "d"], (id) => id, "b\u0000a\u0000c").items, ["a", "b", "c", "d"]);
assert.deepEqual(syncIncomingOrder(start, ["c", "b", "a"], (id) => id, null).items, ["c", "b", "a"], "a pull with no in-flight reorder still adopts");
assert.deepEqual(revertOrderIfSameMembers(["b", "a"], ["a", "b"], (id) => id), ["a", "b"]);
assert.equal(revertOrderIfSameMembers(["a", "b", "c"], ["a", "b"], (id) => id), null);

const exclude = read("components/listings/PhotoExcludeManager.tsx");
assert.ok(exclude.includes("Set as hero"));
assert.ok(exclude.includes("updatePadsplitGallery"));
assert.ok(exclude.includes("new Set(asUrlList(excludedUrls))"));
assert.ok(exclude.includes("SortablePhotoGrid"));
assert.ok(exclude.includes("revertOrderIfSameMembers"));
assert.ok(exclude.includes("PHOTO_ORDER_SAVE_ERROR"));
assert.equal(exclude.includes("ArrowUp"), false);
assert.equal(exclude.includes("Move earlier"), false);

const uploader = read("components/listings/PhotoUploader.tsx");
assert.ok(uploader.includes("Set as hero"));
assert.ok(uploader.includes("updateListingPhotoOrder"));
assert.ok(uploader.includes("addListingPhoto"));
assert.ok(uploader.includes("SortablePhotoGrid"));
assert.ok(uploader.includes("revertOrderIfSameMembers"));
assert.ok(uploader.includes("PHOTO_ORDER_SAVE_ERROR"));
assert.ok(uploader.includes("removeListingPhoto"));
assert.equal(uploader.includes("ArrowUp"), false);
assert.equal(uploader.includes("Move earlier"), false);

const grid = read("components/listings/SortablePhotoGrid.tsx");
assert.ok(grid.includes("MouseSensor"));
assert.ok(grid.includes("TouchSensor"));
assert.ok(grid.includes("KeyboardSensor"));
assert.ok(grid.includes("sortableKeyboardCoordinates"));
assert.ok(grid.includes("border-dashed"));
assert.ok(grid.includes("cursor-grab"));
assert.ok(grid.includes("Drag to reorder"));
assert.ok(grid.includes("Picked up photo"));
assert.ok(grid.includes("Photo dropped at position"));
assert.ok(grid.includes("reorderById"));

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
