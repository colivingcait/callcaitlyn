import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  OM_SIDECAR_SCHEMA_VERSION,
  parseOmSidecar,
  parseOmSidecarJson,
  planOmSidecarApply,
  type ListingOmSnapshot,
} from "./om-sidecar";

// Local proof that Vera's versioned sidecar hydrates the existing listings
// bands + financials JSONB shape. No Supabase. Run with:
//   npx tsx lib/listings/om-sidecar.proof.ts

const fixture = JSON.parse(readFileSync(join(process.cwd(), "lib/listings/fixtures/candace_om_sidecar_v1.json"), "utf8"));

const emptyListing: ListingOmSnapshot = {
  nickname: null,
  om_number: null,
  submarket: null,
  total_rooms: null,
  band_gross_rent: null,
  band_expense_load: null,
  band_cash_on_cash: null,
  band_cap_rate: null,
  financials: null,
  improvements: null,
};

assert.equal(OM_SIDECAR_SCHEMA_VERSION, 1);

const parsed = parseOmSidecar(fixture);
if (!parsed.ok) throw new Error(parsed.error);
assert.equal(parsed.ok, true);

const plan = planOmSidecarApply(parsed.sidecar, emptyListing);
assert.equal(plan.dealKey, "candace");
assert.equal(plan.buyerWorkbookHint, "Candace_OM_Financials_TTM.xlsx");
assert.equal(plan.protectedCount, 0);
assert.equal(plan.patch.nickname, "Candace");
assert.equal(plan.patch.om_number, undefined, "empty om_number must not overwrite");
assert.equal(plan.patch.submarket, "Atlanta metro");
assert.equal(plan.patch.total_rooms, 8);
assert.equal(plan.patch.band_gross_rent, "$60k–$65k TTM collected");
assert.equal(plan.patch.band_expense_load, "15–20% of gross");
assert.equal(plan.patch.band_cash_on_cash, "18–22% @ 20% down / 7% / 30yr DSCR");
assert.equal(plan.patch.band_cap_rate, "10–11%");

const fin = plan.patch.financials;
assert.equal(fin.t12.length, 10);
assert.deepEqual(fin.t12[0], { label: "Gross collected (PadSplit, cash)", value: "61483.07", subtotal: false });
assert.deepEqual(fin.t12[2], { label: "Net to host", value: "53304.89", subtotal: true });
assert.deepEqual(fin.t12[9], { label: "NOI", value: "41216.71", subtotal: true });
assert.equal(fin.noi, "41216.71");
assert.equal(fin.cap_rate, "10.30");
assert.equal(fin.vacancy_pct, "13.7");
assert.equal(fin.occupancy_summary, "TTM bed-night occupancy 86.3% (8 rooms). Soft months: Jun ~57.5%, Sep in-flight ~66%.");
assert.equal(fin.platform_fees, "8178.18");
assert.equal(fin.pm_fees, "1075.00");
assert.equal(fin.expense_load_pct, "19.7");
assert.equal(fin.dscr, "1.61");
assert.equal(fin.purchase_price, "400000");
assert.equal(fin.scenarios.length, 2);
assert.equal(fin.scenarios[0].label, "20% down / 7% / 30yr DSCR");
assert.equal(fin.scenarios[0].coc, "19.59");
assert.equal(fin.scenarios[0].cash_in, "80000");
assert.equal(fin.scenarios[0].debt_service, "25547.62");
assert.equal(fin.scenarios[0].cash_flow, "15669.10");
assert.equal(fin.scenarios[0].dscr, "1.61");
assert.equal(fin.scenarios[0].loan_amount, "320000");
assert.equal(fin.scenarios[1].label, "All-cash");
assert.equal(fin.scenarios[1].coc, "10.30");
assert.equal(fin.scenarios[1].dscr, "");
assert.equal(fin.scenarios[1].loan_amount, "0");
assert.equal(fin.deal_key, "candace");
assert.equal(fin.buyer_workbook_filename, "Candace_OM_Financials_TTM.xlsx");
assert.ok(fin.meta && typeof fin.meta === "object");
assert.equal((fin.meta as { period?: string }).period, "TTM 2025-10 to 2026-09");
assert.equal(plan.patch.improvements, undefined, "empty sidecar improvements against empty listing is a no-op");

const filled: ListingOmSnapshot = {
  ...emptyListing,
  nickname: "Westside 8",
  om_number: "OM-2026-04",
  submarket: "West Atlanta",
  total_rooms: 6,
  band_gross_rent: "old band",
  financials: { t12: [], noi: "1", cap_rate: "2", scenarios: [], keep_me: "yes" } as never,
};

const protectedPlan = planOmSidecarApply(parsed.sidecar, filled);
assert.equal(protectedPlan.patch.nickname, undefined);
assert.equal(protectedPlan.patch.submarket, undefined);
assert.equal(protectedPlan.patch.total_rooms, undefined);
assert.equal(protectedPlan.protectedCount >= 3, true);
assert.equal(protectedPlan.patch.band_gross_rent, "$60k–$65k TTM collected");
assert.equal((protectedPlan.patch.financials as { keep_me?: string }).keep_me, "yes", "unknown existing financials keys must survive ingest");

const overwritePlan = planOmSidecarApply(parsed.sidecar, filled, { overwriteHints: true });
assert.equal(overwritePlan.patch.nickname, "Candace");
assert.equal(overwritePlan.patch.submarket, "Atlanta metro");
assert.equal(overwritePlan.patch.total_rooms, 8);

const withImprovements: ListingOmSnapshot = {
  ...emptyListing,
  improvements: [{ item: "Roof", year: "2022", cost: "11000" }],
};
const clearImprovements = planOmSidecarApply(parsed.sidecar, withImprovements);
assert.equal(clearImprovements.patch.improvements, null);

const v2 = parseOmSidecar({ ...fixture, schema_version: 2 });
assert.equal(v2.ok, false);
if (!v2.ok) assert.match(v2.error, /Unsupported sidecar schema_version 2/);

const v2dot = parseOmSidecarJson(JSON.stringify({ schema_version: "2.1", financials: {} }));
assert.equal(v2dot.ok, false);
if (!v2dot.ok) assert.match(v2dot.error, /Unsupported sidecar schema_version 2\.1/);

const missing = parseOmSidecarJson('{"financials":{"noi":"1"}}');
assert.equal(missing.ok, false);
if (!missing.ok) assert.match(missing.error, /schema_version/);

const badJson = parseOmSidecarJson("{nope");
assert.equal(badJson.ok, false);
if (!badJson.ok) assert.equal(badJson.error, "Invalid JSON.");

const numbersAsNumbers = parseOmSidecar({
  schema_version: 1,
  financials: {
    noi: 41216.71,
    cap_rate: 10.3,
    t12: [{ label: "NOI", value: 41216.71, subtotal: true }],
    scenarios: [{ label: "All-cash", coc: 10.3, cash_in: 400000, debt_service: 0, cash_flow: 41216.71 }],
  },
});
assert.equal(numbersAsNumbers.ok, true);
if (numbersAsNumbers.ok) {
  const mapped = planOmSidecarApply(numbersAsNumbers.sidecar, emptyListing).patch.financials;
  assert.equal(mapped.noi, "41216.71");
  assert.equal(mapped.t12[0].value, "41216.71");
  assert.equal(mapped.scenarios[0].cash_in, "400000");
}

assert.ok(plan.changes.some((c) => c.group === "bands" && c.path === "band_gross_rent"));
assert.ok(plan.changes.some((c) => c.group === "financials" && c.path === "financials.t12"));
assert.ok(plan.changes.some((c) => c.group === "documents" && c.path === "documents.buyer_workbook"));

const documents = readFileSync(join(process.cwd(), "lib/listings/documents.ts"), "utf8");
assert.ok(documents.includes('buyer_workbook: "Buyer workbook"'));
assert.ok(documents.includes("earnings_statement"));
assert.ok(documents.includes('t12: "T12"'));

const uploader = readFileSync(join(process.cwd(), "components/listings/DocumentUploader.tsx"), "utf8");
assert.ok(uploader.includes("buyer_workbook"));
assert.ok(uploader.includes("LISTING_DOCUMENT_TYPES"));

const unlock = readFileSync(join(process.cwd(), "app/listing/[slug]/actions.ts"), "utf8");
assert.ok(unlock.includes("LISTING_DOCUMENT_LABELS"));

const marketing = readFileSync(join(process.cwd(), "app/(app)/listings/[id]/page.tsx"), "utf8");
assert.ok(marketing.includes("ApplyToOmPanel"));
assert.ok(marketing.includes("listingId={listing.id}"));

console.log("om sidecar: ok");
