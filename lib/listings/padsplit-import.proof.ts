import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parsePadsplitListingHtml, parsePadsplitNextData } from "./padsplit-parse";
import { padsplitGalleryOneShotPatch, padsplitLiveImportPatch } from "./padsplit-import";

// First-save PadSplit import. Run with:
//   npx tsx lib/listings/padsplit-import.proof.ts

const property = {
  totalRoomsCount: 9,
  isFullyBooked: true,
  bedrooms: 8,
  rooms: [],
  roomMinPrice: 0,
  pictures: [
    { location: "https://cdn.example/kitchen.jpg", category: "common_space", description: "dining_room" },
    { location: "https://cdn.example/front.jpg", category: "exterior", description: "front of house" },
    { location: "https://cdn.example/bed.jpg", category: "bedroom" },
  ],
};

const parsed = parsePadsplitNextData({ props: { pageProps: { property } } }, { beds: null, financials: null });
assert.equal(parsed.ok, true);
if (!parsed.ok) throw new Error("parse failed");
assert.equal(parsed.snapshot.totalRooms, 8, "bedrooms wins over listed totalRoomsCount");
assert.equal(parsed.snapshot.occupiedRooms, 8);
assert.deepEqual(
  parsed.snapshot.photos.map((photo) => photo.url),
  ["https://cdn.example/kitchen.jpg", "https://cdn.example/bed.jpg", "https://cdn.example/front.jpg"],
);
assert.deepEqual(parsed.snapshot.interiorUrls, ["https://cdn.example/kitchen.jpg", "https://cdn.example/bed.jpg"]);

const withOverride = parsePadsplitNextData(
  { props: { pageProps: { property } } },
  { beds: 6, financials: { occupancy: { rooms: 10 } } },
);
assert.equal(withOverride.ok, true);
if (withOverride.ok) assert.equal(withOverride.snapshot.totalRooms, 10);

const html = `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { property } } })}</script></html>`;
const fromHtml = parsePadsplitListingHtml(html);
assert.equal(fromHtml.ok, true);
assert.equal(parsePadsplitListingHtml("<html>just a moment</html>").ok, false);

const emptyListing = {
  beds: null,
  financials: null,
  photo_paths: [] as string[],
  photo_source: "manual",
  padsplit_gallery: null,
  padsplit_photos: null,
  hero_photo_url: null,
};

const live = padsplitLiveImportPatch(parsed.snapshot, emptyListing, { replaceGallery: false, scrapedAt: "2026-09-21T16:43:00.000Z" });
assert.equal(live.photo_source, "padsplit");
assert.equal(live.occupied_rooms, 8);
assert.equal(live.total_rooms, 8);
assert.deepEqual(
  (live.padsplit_gallery as { url: string }[]).map((photo) => photo.url),
  ["https://cdn.example/kitchen.jpg", "https://cdn.example/bed.jpg"],
);
assert.equal("hero_photo_url" in live, false);

const curated = padsplitGalleryOneShotPatch({
  ...emptyListing,
  photo_source: "padsplit",
  padsplit_gallery: [{ url: "https://cdn.example/bed.jpg", category: "bedroom" }],
  padsplit_photos: parsed.snapshot.photos,
});
assert.equal(curated, null, "a saved gallery is not replaced");

const forced = padsplitGalleryOneShotPatch(
  {
    ...emptyListing,
    photo_paths: ["uploads/a.jpg"],
    padsplit_gallery: [{ url: "https://cdn.example/bed.jpg", category: "bedroom" }],
    padsplit_photos: parsed.snapshot.photos,
  },
  { force: true },
);
assert.ok(forced);
assert.equal(forced?.photo_source, undefined, "uploads keep the manual source");
assert.deepEqual(
  (forced?.padsplit_gallery as { url: string }[]).map((photo) => photo.url),
  ["https://cdn.example/kitchen.jpg", "https://cdn.example/bed.jpg"],
);

const root = process.cwd();
const actions = readFileSync(join(root, "app/(app)/listings/actions.ts"), "utf8");
assert.ok(actions.includes("importPadsplitAfterUrlSave"));
assert.ok(actions.includes("fetchPadsplitSnapshot"));
const basics = readFileSync(join(root, "components/listings/BasicsForm.tsx"), "utf8");
assert.ok(basics.includes("imports rooms and interior photos once"));
assert.equal(basics.includes("automatically once a day"), false);
const scrape = readFileSync(join(root, "scripts/scrape-padsplit.mjs"), "utf8");
assert.ok(scrape.includes("function oneShotGalleryPatch"));
const occupancyUpdate = scrape.match(/update\(\{[\s\S]*?occupied_rooms:[\s\S]*?\}\)/)?.[0] ?? "";
assert.ok(occupancyUpdate.includes("padsplit_photos"));
assert.equal(occupancyUpdate.includes("padsplit_gallery"), false);
assert.equal(occupancyUpdate.includes("photo_source"), false);
assert.equal(occupancyUpdate.includes("hero_photo_url"), false);
const migration = readFileSync(join(root, "supabase/migrations/0083_padsplit_gallery_backfill.sql"), "utf8");
assert.ok(migration.includes("photo_source = 'padsplit'"));
assert.ok(migration.includes("padsplit_gallery"));
assert.ok(migration.includes("hero_photo_url"));
assert.equal(migration.includes("set hero_photo_url"), false);

console.log("padsplit import: ok");
