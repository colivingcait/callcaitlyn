import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  LISTING_STATUSES,
  STATUS_LABEL,
  isListingStatus,
  isPublicAvailableStatus,
  isPublicUnderContractStatus,
  listingStatusLabel,
  mapLegacyListingStatus,
  nextListingStatus,
} from "./status";

assert.deepEqual(LISTING_STATUSES, ["coming_soon", "active", "under_contract", "archived"]);
assert.equal(STATUS_LABEL.coming_soon, "Coming soon");
assert.equal(STATUS_LABEL.active, "Active");
assert.equal(STATUS_LABEL.under_contract, "Under contract");
assert.equal(STATUS_LABEL.archived, "Archived");
assert.equal("closed" in STATUS_LABEL, false);
assert.equal("sold" in STATUS_LABEL, false);
assert.equal("inactive" in STATUS_LABEL, false);

assert.equal(mapLegacyListingStatus("coming_soon"), "coming_soon");
assert.equal(mapLegacyListingStatus("active"), "active");
assert.equal(mapLegacyListingStatus("under_contract"), "under_contract");
assert.equal(mapLegacyListingStatus("archived"), "archived");
assert.equal(mapLegacyListingStatus("closed"), "archived");
assert.equal(mapLegacyListingStatus("sold"), "archived");
assert.equal(mapLegacyListingStatus("inactive"), "archived");
assert.equal(mapLegacyListingStatus("CLOSED"), "archived");
assert.equal(mapLegacyListingStatus("something_else"), "archived");
assert.equal(mapLegacyListingStatus(null), null);

assert.equal(listingStatusLabel("closed"), "Archived");
assert.equal(listingStatusLabel("under_contract"), "Under contract");
assert.equal(isListingStatus("archived"), true);
assert.equal(isListingStatus("closed"), false);

assert.equal(nextListingStatus("coming_soon"), "active");
assert.equal(nextListingStatus("active"), "under_contract");
assert.equal(nextListingStatus("under_contract"), "archived");
assert.equal(nextListingStatus("archived"), null);

assert.equal(isPublicAvailableStatus("coming_soon"), true);
assert.equal(isPublicAvailableStatus("active"), true);
assert.equal(isPublicAvailableStatus("under_contract"), false);
assert.equal(isPublicAvailableStatus("archived"), false);
assert.equal(isPublicUnderContractStatus("under_contract"), true);
assert.equal(isPublicUnderContractStatus("archived"), false);

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const crmPage = read("app/(app)/listings/page.tsx");
assert.ok(crmPage.includes("LISTING_STATUSES"));
assert.equal(crmPage.includes('"closed"'), false);

const menu = read("components/listings/ListingStatusMenu.tsx");
assert.ok(menu.includes("LISTING_STATUSES"));
assert.ok(menu.includes("Coming soon") || menu.includes("STATUS_LABEL"));
assert.equal(menu.includes("Closed"), false);

const types = read("types/database.ts");
assert.ok(types.includes('"coming_soon" | "active" | "under_contract" | "archived"'));
assert.equal(types.includes('"coming_soon" | "active" | "under_contract" | "closed"'), false);

const migration = read("supabase/migrations/0082_listing_status_archived.sql");
assert.ok(migration.includes("closed"));
assert.ok(migration.includes("sold"));
assert.ok(migration.includes("inactive"));
assert.ok(migration.includes("'archived'"));
assert.ok(migration.includes("listings_status_check"));
assert.ok(migration.includes("listing_status_changes"));

console.log("listing-status proof: ok");
