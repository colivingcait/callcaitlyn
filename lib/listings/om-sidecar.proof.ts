import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  OM_SIDECAR_SCHEMA_VERSION,
  SIDECAR_FIELD_MAP,
  parseOmSidecar,
  parseOmSidecarJson,
  planOmSidecarApply,
  type ListingOmSnapshot,
} from "./om-sidecar";
import { knownImprovementTotal } from "./crm-marketing-fields";

// Local proof that Vera's versioned sidecar hydrates the existing listings
// bands + financials JSONB shape. No Supabase. Run with:
//   npx tsx lib/listings/om-sidecar.proof.ts

const fixture = JSON.parse(readFileSync(join(process.cwd(), "lib/listings/fixtures/candace_om_sidecar_v2.json"), "utf8"));
const fixtureV1 = JSON.parse(readFileSync(join(process.cwd(), "lib/listings/fixtures/candace_om_sidecar_v1.json"), "utf8"));

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

assert.equal(OM_SIDECAR_SCHEMA_VERSION, 2);
assert.deepEqual(SIDECAR_FIELD_MAP.public_ui, fixture.field_map.public_ui);
assert.deepEqual(SIDECAR_FIELD_MAP.gated_ui, fixture.field_map.gated_ui);
assert.deepEqual(SIDECAR_FIELD_MAP.gated_removed, fixture.field_map.gated_removed);
assert.equal(SIDECAR_FIELD_MAP.padsplit_url, fixture.field_map.padsplit_url);
assert.deepEqual(fixture.field_map, SIDECAR_FIELD_MAP);

const parsed = parseOmSidecar(fixture);
if (!parsed.ok) throw new Error(parsed.error);
assert.equal(parsed.ok, true);

const plan = planOmSidecarApply(parsed.sidecar, emptyListing);
assert.equal(plan.dealKey, "candace");
assert.equal(plan.buyerWorkbookHint, "Candace_OM_Complete.xlsx");
assert.equal(plan.protectedCount, 0);
assert.equal(plan.patch.nickname, "Candace");
assert.equal(plan.patch.om_number, undefined, "empty om_number must not overwrite");
assert.equal(plan.patch.submarket, "Atlanta metro");
assert.equal(plan.patch.total_rooms, 8);
assert.equal(plan.patch.padsplit_url, "https://www.padsplit.com/rooms-for-rent/listing/8299");
assert.equal(plan.patch.band_gross_rent, "~$5,500/mo");
assert.equal(plan.patch.band_expense_load, "~19%");
assert.equal(plan.patch.band_cash_on_cash, "~20%");
assert.equal(plan.patch.band_cap_rate, "~10%");

const fin = plan.patch.financials;
assert.equal(fin.t12.length, 7);
assert.deepEqual(fin.t12[0], { label: "Gross rents (collected)", value: "61483.07", subtotal: false });
assert.deepEqual(fin.t12[2], { label: "Net earnings", value: "53304.89", subtotal: true });
assert.deepEqual(fin.t12[4], { label: "NOI", value: "41216.71", subtotal: true });
assert.equal(fin.noi, "3434.73");
assert.equal(fin.cap_rate, "10.30");
assert.equal(fin.padsplit_fees, "8178.18");
assert.equal(fin.dscr, "1.61");
assert.equal(fin.purchase_price, "400000");
assert.equal(fin.gross_rents, "5123.59");
assert.equal(fin.net_earnings, "4442.07");
assert.equal(fin.opex, "1007.35");
assert.equal(fin.projected_debt_service, "2128.97");
assert.equal(fin.net_cash_flow, "1305.76");
assert.equal(fin.annual?.gross_rents, "61483.07");
assert.equal(fin.annual?.net_cash_flow, "15669.09");
assert.equal(fin.annual?.noi, "41216.71");
assert.equal(fin.cash_on_cash, "19.59");
assert.equal(fin.scenarios.length, 1);
assert.equal(fin.scenarios[0].label, "20% down / 7% / 30yr DSCR");
assert.equal(fin.scenarios[0].coc, "19.59");
assert.equal(fin.scenarios[0].cash_in, "80000");
assert.equal(fin.scenarios[0].debt_service, "25547.62");
assert.equal(fin.scenarios[0].cash_flow, "15669.09");
assert.equal(fin.scenarios[0].dscr, "1.61");
assert.equal(fin.scenarios[0].loan_amount, "320000");
assert.equal(fin.deal_key, "candace");
assert.equal(fin.buyer_workbook_filename, "Candace_OM_Complete.xlsx");
assert.equal(fin.occupancy?.rooms, 8);
assert.equal(fin.occupancy?.basis, "bed_night");
assert.equal(fin.occupancy?.t12_occupancy_pct, 86.34);
assert.ok(fin.meta && typeof fin.meta === "object");
assert.equal((fin.meta as { period?: string }).period, "T12 2025-10 to 2026-09");
assert.equal(plan.patch.improvements?.length, 7);
assert.equal(plan.patch.improvements?.find((row) => /roof/i.test(row.item))?.cost, "");
assert.equal(knownImprovementTotal(plan.patch.improvements), 61000);
assert.ok(plan.changes.some((c) => c.group === "improvements" && c.path === "improvements"));

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
assert.equal(protectedPlan.patch.band_gross_rent, "~$5,500/mo");
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
assert.equal(clearImprovements.patch.improvements?.length, 7);
assert.equal(knownImprovementTotal(clearImprovements.patch.improvements), 61000);

const emptyImprovementsSidecar = parseOmSidecar({ ...fixture, improvements: [] });
assert.equal(emptyImprovementsSidecar.ok, true);
if (emptyImprovementsSidecar.ok) {
  const cleared = planOmSidecarApply(emptyImprovementsSidecar.sidecar, withImprovements);
  assert.equal(cleared.patch.improvements, null);
}

const v1 = parseOmSidecar(fixtureV1);
assert.equal(v1.ok, true, "schema_version 1 still hydrates");
if (v1.ok) {
  const v1Plan = planOmSidecarApply(v1.sidecar, emptyListing);
  assert.equal(v1Plan.patch.band_gross_rent, "~$65,000 T12 collected");
  assert.equal(v1Plan.patch.financials.padsplit_fees, "8178.18");
}

const v3 = parseOmSidecar({ ...fixture, schema_version: 3 });
assert.equal(v3.ok, false);
if (!v3.ok) assert.match(v3.error, /Unsupported sidecar schema_version 3/);

const v2dot = parseOmSidecarJson(JSON.stringify({ schema_version: "2.1", financials: {} }));
assert.equal(v2dot.ok, false);
if (!v2dot.ok) assert.match(v2dot.error, /schema_version.*2\.1/);

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
assert.ok(plan.changes.some((c) => c.group === "financials" && c.path === "financials.padsplit_fees"));
assert.ok(plan.changes.some((c) => c.group === "financials" && c.path === "financials.gross_rents"));
assert.ok(plan.changes.some((c) => c.group === "documents" && c.path === "documents.buyer_workbook"));

const aliasOnly = parseOmSidecar({
  schema_version: 1,
  financials: {
    noi: "41216.71",
    cap_rate: "10.30",
    platform_fees: "8178.18",
    purchase_price: "400000",
    dscr: "1.61",
    t12: [
      { label: "Gross collected (PadSplit, cash)", value: "61483.07" },
      { label: "Net to host", value: "53304.89", subtotal: true },
      { label: "Total operating expenses", value: "-12088.18", subtotal: true },
    ],
    scenarios: [{ label: "A", coc: "19.59", cash_in: "80000", debt_service: "25547.62", cash_flow: "1" }],
  },
});
assert.equal(aliasOnly.ok, true);
if (aliasOnly.ok) {
  const mapped = planOmSidecarApply(aliasOnly.sidecar, emptyListing).patch.financials;
  assert.equal(mapped.padsplit_fees, "8178.18", "platform_fees hydrates padsplit_fees");
  assert.equal(mapped.gross_rents, "5123.59", "t12 annual fallback becomes monthly");
  assert.equal(mapped.net_earnings, "4442.07");
  assert.equal(mapped.opex, "-1007.35");
  assert.equal(mapped.projected_debt_service, "2128.97");
  assert.equal(mapped.cash_on_cash, "19.59");
}

const cashflowAlias = parseOmSidecar({
  schema_version: 2,
  financials: {
    noi: "3434.73",
    cap_rate: "10.30",
    net_cashflow: "1305.76",
    t12: [],
    scenarios: [],
  },
});
assert.equal(cashflowAlias.ok, true);
if (cashflowAlias.ok) {
  const mapped = planOmSidecarApply(cashflowAlias.sidecar, emptyListing).patch.financials;
  assert.equal(mapped.net_cash_flow, "1305.76", "net_cashflow alias hydrates net_cash_flow");
}

const documents = readFileSync(join(process.cwd(), "lib/listings/documents.ts"), "utf8");
assert.ok(documents.includes('buyer_workbook: "Vera\'s buyer workbook"'));
assert.ok(documents.includes("earnings_statement"));
assert.ok(documents.includes('t12: "T12"'));
assert.ok(documents.includes("MARKETING_UPLOAD_TYPES"));

const uploader = readFileSync(join(process.cwd(), "components/listings/DocumentUploader.tsx"), "utf8");
assert.ok(uploader.includes("buyer_workbook"));
assert.ok(uploader.includes("MARKETING_UPLOAD_TYPES"));
assert.equal(uploader.includes("LISTING_DOCUMENT_TYPES"), false, "Marketing uploader must not iterate the full DB enum");

const unlock = readFileSync(join(process.cwd(), "app/listing/[slug]/actions.ts"), "utf8");
assert.ok(unlock.includes("LISTING_DOCUMENT_LABELS"));
assert.ok(unlock.includes("buyer_workbook"));
assert.ok(unlock.includes("workbookUrl"));

const marketing = readFileSync(join(process.cwd(), "app/(app)/listings/[id]/page.tsx"), "utf8");
assert.ok(marketing.includes("ApplyToOmPanel"));
assert.ok(marketing.includes("listingId={listing.id}"));

console.log("om sidecar: ok");
