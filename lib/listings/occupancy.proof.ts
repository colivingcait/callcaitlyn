import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  occupancyTrendFromSidecar,
  occupancyTrendHasSidecarData,
  parseListingOccupancy,
  resolveLiveOccupancy,
  t12OccupancySummary,
} from "./occupancy";
import { parseOmSidecar, planOmSidecarApply, type ListingOmSnapshot } from "./om-sidecar";

// Live PadSplit vs Vera T12 occupancy. Run with:
//   npx tsx lib/listings/occupancy.proof.ts

const gresham = resolveLiveOccupancy({
  listedOccupied: 4,
  listedTotal: 6,
  houseBedrooms: 8,
});
assert.deepEqual(gresham, { occupied: 6, total: 8, available: 2 }, "Gresham Park Eight: 2 available of 8 beds → 6/8");

assert.deepEqual(
  resolveLiveOccupancy({ listedOccupied: 4, listedTotal: 6, overrideTotal: 8 }),
  { occupied: 6, total: 8, available: 2 },
);

assert.deepEqual(
  resolveLiveOccupancy({ listedOccupied: 6, listedTotal: 6, houseBedrooms: 6 }),
  { occupied: 6, total: 6, available: 0 },
);

const emptyTrend = occupancyTrendFromSidecar({ rooms: 8, basis: "bed_night", t12_occupancy_pct: 86.34, monthly: [] });
assert.equal(emptyTrend.length, 12);
assert.equal(occupancyTrendHasSidecarData(emptyTrend), false, "no monthly[] means T12 stays empty — never invent scrape bars");
assert.ok(emptyTrend.every((p) => p.total == null && p.pct === 0));

const monthly = [
  { month: "2025-10", occupancy_pct: 90, occupied_bed_nights: 223, available_bed_nights: 248, days_in_month: 31 },
  { month: "2025-11", occupancy_pct: 88, occupied_bed_nights: 211, available_bed_nights: 240, days_in_month: 30 },
  { month: "2025-12", occupancy_pct: 91, occupied_bed_nights: 226, available_bed_nights: 248, days_in_month: 31 },
  { month: "2026-01", occupancy_pct: 89, occupied_bed_nights: 221, available_bed_nights: 248, days_in_month: 31 },
  { month: "2026-02", occupancy_pct: 87, occupied_bed_nights: 195, available_bed_nights: 224, days_in_month: 28 },
  { month: "2026-03", occupancy_pct: 92, occupied_bed_nights: 228, available_bed_nights: 248, days_in_month: 31 },
  { month: "2026-04", occupancy_pct: 90, occupied_bed_nights: 216, available_bed_nights: 240, days_in_month: 30 },
  { month: "2026-05", occupancy_pct: 88, occupied_bed_nights: 218, available_bed_nights: 248, days_in_month: 31 },
  { month: "2026-06", occupancy_pct: 57.5, occupied_bed_nights: 138, available_bed_nights: 240, days_in_month: 30 },
  { month: "2026-07", occupancy_pct: 85, occupied_bed_nights: 211, available_bed_nights: 248, days_in_month: 31 },
  { month: "2026-08", occupancy_pct: 84, occupied_bed_nights: 208, available_bed_nights: 248, days_in_month: 31 },
  { month: "2026-09", occupancy_pct: 66, occupied_bed_nights: 158, available_bed_nights: 240, days_in_month: 30, in_flight: true },
];
const occupancy = parseListingOccupancy({ rooms: 8, basis: "bed_night", t12_occupancy_pct: 86.34, monthly });
assert.ok(occupancy);
assert.equal(occupancy?.monthly?.length, 12);
const trend = occupancyTrendFromSidecar(occupancy, new Date("2026-09-20T12:00:00Z"));
assert.equal(trend.length, 12);
assert.equal(occupancyTrendHasSidecarData(trend), true);
assert.equal(trend[0].label, "Oct");
assert.equal(trend[0].pct, 90);
assert.equal(trend[8].pct, 58);
assert.equal(trend[11].pct, 66);
assert.equal(trend[11].inFlight, true);
const summary = t12OccupancySummary(occupancy, trend);
assert.ok(summary?.includes("T12 86.34%"));
assert.ok(summary?.includes("8 rooms"));
assert.ok(summary?.includes("bed-night"));

const fixture = JSON.parse(readFileSync(join(process.cwd(), "lib/listings/fixtures/candace_om_sidecar_v2.json"), "utf8"));
const parsed = parseOmSidecar(fixture);
if (!parsed.ok) throw new Error(parsed.error);
const emptyListing: ListingOmSnapshot = {
  nickname: null,
  om_number: null,
  submarket: null,
  total_rooms: null,
  padsplit_url: null,
  band_gross_rent: null,
  band_expense_load: null,
  band_cash_on_cash: null,
  band_cap_rate: null,
  financials: null,
  improvements: null,
};
const plan = planOmSidecarApply(parsed.sidecar, emptyListing);
assert.equal(plan.patch.financials.occupancy?.rooms, 8);
assert.ok(plan.changes.some((c) => c.group === "occupancy"));

const scrape = readFileSync(join(process.cwd(), "scripts/scrape-padsplit.mjs"), "utf8");
assert.ok(scrape.includes("totalRoomsCount"));
assert.ok(scrape.includes("bedrooms"));
const publicData = readFileSync(join(process.cwd(), "lib/listings/public-data.ts"), "utf8");
assert.equal(publicData.includes("listing_occupancy_snapshots"), false);
assert.ok(publicData.includes("occupancyTrendFromSidecar"));
assert.ok(publicData.includes("listingLiveOccupancy"));

const unlock = readFileSync(join(process.cwd(), "app/listing/[slug]/actions.ts"), "utf8");
assert.ok(unlock.includes('addTagByName(admin, OWNER_ID, contact.id, "Investor Lead")'));
assert.ok(unlock.includes("if (!tagged)"));
assert.ok(unlock.includes("if (!activity?.id)"));
assert.ok(unlock.includes("skipQuoSync: true"));
assert.match(unlock, /return \{ ok: true, financials, workbookUrl \}/);
const taggedIdx = unlock.indexOf("if (!tagged)");
const okIdx = unlock.lastIndexOf("return { ok: true, financials, workbookUrl }");
assert.ok(taggedIdx > 0 && taggedIdx < okIdx, "Investor Lead tag must land before unlock returns ok");

console.log("occupancy: ok");
