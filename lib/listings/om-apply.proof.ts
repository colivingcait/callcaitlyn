import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isListingUuid,
  loadListingForOmApply,
  omApplyLookupColumns,
  planOwnedOmSidecarApply,
  snapshotListingForOmApply,
  type OmApplyGetBy,
  type OmApplyListingRow,
} from "./om-apply";

// Apply-to-OM must use the Marketing page's listings.id UUID. Preview diffs
// in memory; Apply re-fetches. A wrong UUID must 404 (no slug fallback).
// Run with: npx tsx lib/listings/om-apply.proof.ts

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const fixtureRaw = readFileSync(join(root, "lib/listings/fixtures/candace_om_sidecar_v1.json"), "utf8");

const CANDACE_ID = "c0a1dace-0000-4000-8000-000000000001";
const WRONG_ID = "00000000-0000-4000-8000-000000000099";

const candace: OmApplyListingRow = {
  id: CANDACE_ID,
  public_slug: "candace",
  nickname: null,
  om_number: "OM-CANDACE",
  submarket: null,
  total_rooms: null,
  band_gross_rent: null,
  band_expense_load: null,
  band_cash_on_cash: null,
  band_cap_rate: null,
  financials: null,
  improvements: null,
};

const rows: OmApplyListingRow[] = [candace];

const getBy: OmApplyGetBy = async (column, value) => {
  const listing = rows.find((row) => row[column] === value) ?? null;
  return { listing };
};

assert.equal(isListingUuid(CANDACE_ID), true);
assert.equal(isListingUuid("candace"), false);
assert.equal(isListingUuid("OM-CANDACE"), false);
assert.deepEqual(omApplyLookupColumns(CANDACE_ID), [{ column: "id", value: CANDACE_ID }]);
assert.deepEqual(omApplyLookupColumns(WRONG_ID), [{ column: "id", value: WRONG_ID }]);
assert.deepEqual(omApplyLookupColumns("candace"), [
  { column: "public_slug", value: "candace" },
  { column: "om_number", value: "candace" },
]);
assert.deepEqual(omApplyLookupColumns(""), []);

async function runApplyCases() {
  const applied = await planOwnedOmSidecarApply(CANDACE_ID, fixtureRaw, getBy);
  if (!applied.ok) throw new Error(applied.error);
  assert.equal(applied.ok, true, "apply-with-listing-id must succeed");
  assert.equal(applied.listingId, CANDACE_ID, "writes must target listings.id UUID");
  assert.equal(applied.publicSlug, "candace");
  assert.equal(applied.patch.band_gross_rent, "$60k–$65k TTM collected");
  assert.equal(applied.patch.band_expense_load, "15–20% of gross");
  assert.equal(applied.patch.band_cash_on_cash, "18–22% @ 20% down / 7% / 30yr DSCR");
  assert.equal(applied.patch.band_cap_rate, "10–11%");
  const financials = applied.patch.financials as { noi?: string; t12?: unknown[]; deal_key?: string };
  assert.equal(financials.noi, "41216.71");
  assert.equal(Array.isArray(financials.t12) && financials.t12.length, 10);
  assert.equal(financials.deal_key, "candace");
  assert.equal(applied.patch.nickname, "Candace");
  assert.equal(applied.patch.submarket, "Atlanta metro");
  assert.equal(applied.patch.total_rooms, 8);
  assert.equal("om_number" in applied.patch, false, "empty sidecar om_number must not overwrite");

  const missing = await planOwnedOmSidecarApply(WRONG_ID, fixtureRaw, getBy);
  assert.equal(missing.ok, false, "wrong listing id must 404");
  if (!missing.ok) assert.equal(missing.error, "Listing not found");

  const uuidMiss = await loadListingForOmApply(WRONG_ID, getBy);
  assert.equal(uuidMiss.ok, false, "UUID miss must not fall through to public_slug=candace");

  const viaSlug = await planOwnedOmSidecarApply("candace", fixtureRaw, getBy);
  assert.equal(viaSlug.ok, true, "non-UUID key may resolve public_slug");
  if (viaSlug.ok) assert.equal(viaSlug.listingId, CANDACE_ID, "slug hit still writes listings.id");

  const viaOm = await loadListingForOmApply("OM-CANDACE", getBy);
  assert.equal(viaOm.ok, true);
  if (viaOm.ok) assert.equal(viaOm.listing.id, CANDACE_ID);

  const queryError = await planOwnedOmSidecarApply(CANDACE_ID, fixtureRaw, async () => ({
    listing: null,
    error: "invalid input syntax for type uuid",
  }));
  assert.equal(queryError.ok, false);
  if (!queryError.ok) assert.equal(queryError.error, "invalid input syntax for type uuid");

  assert.deepEqual(snapshotListingForOmApply(candace).financials, null);
}

const panel = read("components/listings/ApplyToOmPanel.tsx");
assert.ok(panel.includes("listingId, listing"));
assert.ok(panel.includes("applyOmSidecarToListing({"));
assert.ok(panel.includes("listingId,"));
assert.ok(panel.includes("rawJson: raw"));
assert.equal(panel.includes("applyOmSidecarToListing(listing.id,"), false, "do not pass positional listing.id");
assert.equal(panel.includes("listing.public_slug"), false, "Apply key is listings.id, not public_slug");

const page = read("app/(app)/listings/[id]/page.tsx");
assert.ok(page.includes("listingId={listing.id}"));

const actions = read("app/(app)/listings/actions.ts");
assert.ok(actions.includes("planOwnedOmSidecarApply"));
assert.ok(actions.includes("input.listingId"));
const applyStart = actions.indexOf("export async function applyOmSidecarToListing");
const applyEnd = actions.indexOf("export async function", applyStart + 1);
const applyFn = actions.slice(applyStart, applyEnd);
assert.ok(applyFn.includes(".eq(\"id\", result.listingId)"));
assert.equal(applyFn.includes(".eq(\"id\", listingId)"), false, "do not UPDATE by the raw client key");

runApplyCases()
  .then(() => {
    console.log("om apply listing id: ok");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
