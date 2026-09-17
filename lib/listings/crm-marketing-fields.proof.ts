import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_DD_DAYS,
  DEFAULT_SELLER_SUPPORT_DAYS,
  asImprovements,
  asPhotoList,
  asUrlList,
  daysInputValue,
  normalizeFinancials,
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

const partial = normalizeFinancials({ noi: "$1", cap_rate: "10%" } as never);
assert.deepEqual(partial.t12, []);
assert.deepEqual(partial.scenarios, []);
assert.equal(partial.noi, "$1");

assert.deepEqual(asImprovements(null), []);
assert.deepEqual(asImprovements(undefined), []);
assert.deepEqual(asImprovements({} as never), []);
assert.deepEqual(asImprovements([{ item: "Roof", year: "2022", cost: "$1" }]), [{ item: "Roof", year: "2022", cost: "$1" }]);
assert.deepEqual(asImprovements([{} as never]), [{ item: "", year: "", cost: "" }]);

assert.deepEqual(asPhotoList(null), []);
assert.deepEqual(asPhotoList(undefined), []);
assert.deepEqual(asUrlList(null), []);
assert.deepEqual(asUrlList(undefined), []);
assert.throws(() => {
  const listing: { dd_days?: number | null } = {};
  listing.dd_days!.toString();
});
assert.equal(daysInputValue(({} as { dd_days?: number }).dd_days, DEFAULT_DD_DAYS), "10");

const om = read("components/listings/OmDetailsForm.tsx");
assert.equal(om.includes("listing.dd_days.toString()"), false, "dd_days.toString() white-screens when the field is missing");
assert.equal(om.includes("listing.seller_support_days.toString()"), false, "seller_support_days.toString() white-screens when the field is missing");
assert.ok(om.includes("daysInputValue(listing.dd_days, DEFAULT_DD_DAYS)"));
assert.ok(om.includes("daysInputValue(listing.seller_support_days, DEFAULT_SELLER_SUPPORT_DAYS)"));
assert.ok(om.includes("listing.show_seller_section ?? true"));

const photos = read("components/listings/PhotoExcludeManager.tsx");
assert.equal(photos.includes("new Set(excludedUrls)"), false, "new Set(null/undefined) throws");
assert.ok(photos.includes("new Set(asUrlList(excludedUrls))"));

const financials = read("components/listings/FinancialsEditor.tsx");
assert.ok(financials.includes("normalizeFinancials(financials)"));

const improvements = read("components/listings/ImprovementsEditor.tsx");
assert.ok(improvements.includes("asImprovements(improvements)"));

const page = read("app/(app)/listings/[id]/page.tsx");
assert.ok(page.includes("asPhotoList(listing.padsplit_photos)"));
assert.ok(page.includes("asUrlList(listing.excluded_photo_urls)"));
assert.ok(page.includes("asUrlList(listing.photo_paths)"));
assert.equal(page.includes("onSend="), false, "no function props from the listing server page into client components");

const errorBoundary = read("app/(app)/listings/[id]/error.tsx");
assert.ok(errorBoundary.includes("This listing tab hit an error"));
assert.ok(errorBoundary.includes("\"use client\""));

const copy = read("components/listings/CopyBlocks.tsx");
assert.equal(copy.includes(")!.body"), false, "non-null assertion on a missing template would white-screen Copy");

console.log("crm marketing fields: ok");
