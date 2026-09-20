import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_DD_DAYS,
  DEFAULT_SELLER_SUPPORT_DAYS,
  asImprovements,
  visibleImprovements,
  knownImprovementTotal,
  asPhotoList,
  asUrlList,
  daysInputValue,
  financialsHaveContent,
  asListingFinancials,
  asPhotoSource,
  normalizeFinancials,
  toPublicUnlockFinancials,
} from "./crm-marketing-fields";

// Local proof that the listing Marketing tab does not throw on missing OM
// fields. No Supabase. Run with:
//   npx tsx lib/listings/crm-marketing-fields.proof.ts

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

assert.equal(DEFAULT_DD_DAYS, 10);
assert.equal(DEFAULT_SELLER_SUPPORT_DAYS, 30);

assert.equal(daysInputValue(undefined, 10), "10");
assert.equal(daysInputValue(null, 10), "10");
assert.equal(daysInputValue("", 10), "10");
assert.equal(daysInputValue(Number.NaN, 10), "10");
assert.equal(daysInputValue("nope", 10), "10");
assert.equal(daysInputValue(14, 10), "14");
assert.equal(daysInputValue("21", 30), "21");
assert.equal(daysInputValue(0, 10), "0");

const emptyFinancials = normalizeFinancials(null);
assert.equal(Array.isArray(emptyFinancials.t12), true);
assert.equal(Array.isArray(emptyFinancials.scenarios), true);
assert.equal(emptyFinancials.t12.length, 0);
assert.equal(emptyFinancials.scenarios.length, 0);
assert.equal(emptyFinancials.noi, "");
assert.equal(emptyFinancials.cap_rate, "");

const partial = normalizeFinancials({ noi: "$1", cap_rate: "10%", keep_me: "yes" } as never);
assert.deepEqual(partial.t12, []);
assert.deepEqual(partial.scenarios, []);
assert.equal(partial.noi, "$1");
assert.equal(partial.net_earnings, "$1");
assert.equal((partial as { keep_me?: string }).keep_me, "yes");
assert.equal(financialsHaveContent(partial), true);
assert.equal(financialsHaveContent(emptyFinancials), false);
assert.equal(financialsHaveContent(normalizeFinancials({ purchase_price: "400000" } as never)), true);
assert.equal(asListingFinancials(null), null);
assert.equal(asListingFinancials(""), null);
assert.equal(asListingFinancials("not-json"), null);
const fromString = asListingFinancials(JSON.stringify({ purchase_price: 400000, cap_rate: 10.3 }));
assert.ok(fromString);
assert.equal(fromString.purchase_price, "400000");
assert.equal(fromString.cap_rate, "10.3");

function hasUndefined(value: unknown): boolean {
  if (value === undefined) return true;
  if (Array.isArray(value)) return value.some(hasUndefined);
  if (value && typeof value === "object") return Object.values(value).some(hasUndefined);
  return false;
}

const unlockPayload = toPublicUnlockFinancials({
  purchase_price: "400000",
  gross_rents: "5123.59",
  noi: "3434.73",
  cap_rate: "10.30",
  dscr: "1.61",
  cash_on_cash: "19.59",
  annual: { gross_rents: "61483.07" },
  occupancy: { rooms: 8, basis: "bed_night", t12_occupancy_pct: 86.34, monthly: [{ month: "2026-09", occupancy_pct: 66 }] },
} as never);
assert.equal(unlockPayload.gross_rents, "5123.59");
assert.equal(unlockPayload.noi, "3434.73");
assert.equal(unlockPayload.occupancy, undefined);
assert.equal("occupancy" in unlockPayload, false);
assert.equal("annual" in unlockPayload, false);
assert.equal(hasUndefined(unlockPayload), false);
assert.deepEqual(JSON.parse(JSON.stringify(unlockPayload)), unlockPayload);
assert.equal(toPublicUnlockFinancials(null).gross_rents, "");
assert.equal(hasUndefined(toPublicUnlockFinancials(null)), false);

assert.deepEqual(asImprovements(null), []);
assert.deepEqual(asImprovements(undefined), []);
assert.deepEqual(asImprovements({} as never), []);
assert.deepEqual(asImprovements([{ item: "Roof", year: "2022", cost: "$1" }]), [{ item: "Roof", year: "2022", cost: "$1" }]);
assert.deepEqual(asImprovements([{} as never]), [{ item: "", year: "", cost: "" }]);
assert.deepEqual(visibleImprovements(null), []);
assert.deepEqual(visibleImprovements([]), []);
assert.deepEqual(visibleImprovements([{ item: "", year: "", cost: "" }]), []);
assert.deepEqual(visibleImprovements([{ item: "Roof", year: "2022", cost: "11000" }]), [{ item: "Roof", year: "2022", cost: "11000" }]);
assert.equal(knownImprovementTotal([{ item: "Roof", year: "", cost: "" }, { item: "HVAC", year: "", cost: "18000" }, { item: "Kitchen", year: "", cost: "43000" }]), 61000);

assert.deepEqual(asPhotoList(null), []);
assert.deepEqual(asPhotoList(undefined), []);
assert.deepEqual(asUrlList(null), []);
assert.deepEqual(asUrlList(undefined), []);
assert.equal(asPhotoSource("padsplit"), "padsplit");
assert.equal(asPhotoSource("manual"), "manual");
assert.equal(asPhotoSource(undefined), "manual");
assert.throws(() => {
  const listing: { dd_days?: number | null } = {};
  listing.dd_days!.toString();
});
assert.equal(daysInputValue(({} as { dd_days?: number }).dd_days, DEFAULT_DD_DAYS), "10");

const om = read("components/listings/OmDetailsForm.tsx");
assert.equal(om.includes("listing.dd_days.toString()"), false, "dd_days.toString() white-screens when the field is missing");
assert.equal(om.includes("listing.seller_support_days.toString()"), false, "seller_support_days.toString() white-screens when the field is missing");
assert.equal(om.includes("Process terms"), false, "Process terms must not render in Marketing");
assert.equal(om.includes("Due diligence days"), false);
assert.equal(om.includes("ddDays"), false);
assert.ok(om.includes("listing.show_seller_section ?? true"));
assert.ok(om.includes("Gross Rents"));
assert.ok(om.includes("Operating Expenses"));
assert.ok(om.includes("Cash-on-cash"));
assert.ok(om.includes("Cap rate"));

const photos = read("components/listings/PhotoExcludeManager.tsx");
assert.equal(photos.includes("new Set(excludedUrls)"), false, "new Set(null/undefined) throws");
assert.ok(photos.includes("new Set(asUrlList(excludedUrls))"));

const financials = read("components/listings/FinancialsEditor.tsx");
assert.ok(financials.includes("normalizeFinancials(financials)"));
assert.ok(financials.includes("GATED_EDITOR_FIELDS"));
assert.equal(financials.includes("Occupancy summary"), false);
assert.equal(financials.includes("PM fees"), false);
assert.equal(financials.includes("T12 line items"), false);

assert.ok(read("components/listings/om/FinancialGate.tsx").includes("visibleImprovements(improvements)"));

const page = read("app/(app)/listings/[id]/page.tsx");
assert.equal(page.includes("ImprovementsEditor"), false, "Marketing has no CapEx input form");
assert.ok(page.includes("ApplyToOmPanel"));
assert.ok(page.includes("listingId={listing.id}"));
assert.ok(page.includes("ListingPhotosPanel"));
assert.ok(page.includes("tab=photos"));
assert.ok(page.includes("asPhotoList(listing.padsplit_photos)"));
assert.ok(page.includes("asPhotoList(listing.padsplit_gallery)"));
assert.ok(page.includes("asUrlList(listing.excluded_photo_urls)"));
assert.ok(page.includes("asUrlList(listing.photo_paths)"));
assert.equal(page.includes("onSend="), false, "no function props from the listing server page into client components");

const errorBoundary = read("app/(app)/listings/[id]/error.tsx");
assert.ok(errorBoundary.includes("This listing tab hit an error"));
assert.ok(errorBoundary.includes("\"use client\""));

const copy = read("components/listings/CopyBlocks.tsx");
assert.equal(copy.includes(")!.body"), false, "non-null assertion on a missing template would white-screen Copy");

console.log("crm marketing fields: ok");
