import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  commissionExportFilename,
  commissionKpis,
  commissionPeriodRangeLabel,
  commissionPeriodBounds,
  dealPayStatus,
  dealPeriodDate,
  dealSideLabel,
  dealStageLabel,
  exportCommissionRows,
  isoInPeriod,
  listingMatchesDealAddress,
  needsCommissionPrompt,
  resolveCommissionPeriod,
  visibleCommissionRows,
  type CommissionRow,
  type UnderContractListing,
} from "./commission-period";
import { computeDeals } from "./commission";
import type { DealWithContact } from "@/lib/data/commissions";

const root = join(process.cwd());
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

assert.equal(resolveCommissionPeriod(undefined), "this_month");
assert.equal(resolveCommissionPeriod("last_month"), "last_month");
assert.equal(resolveCommissionPeriod("nope"), "this_month");
assert.equal(dealSideLabel("buyer"), "Buy");
assert.equal(dealSideLabel("seller"), "List");
assert.equal(dealStageLabel("pending"), "UC");
assert.equal(dealStageLabel("won"), "Closed");
assert.equal(dealPayStatus("pending"), "Pending");
assert.equal(dealPayStatus("won"), "Paid");
assert.equal(needsCommissionPrompt({ status: "pending", gross_commission: 12000, side: "seller", sale_price: 400000 }), true);
assert.equal(needsCommissionPrompt({ status: "won", gross_commission: 12000, side: "seller", sale_price: 400000 }), false);
assert.equal(listingMatchesDealAddress("654 Gillette Ave", "654 Gillette Ave"), true);

const now = new Date("2026-09-20T16:00:00.000Z");
const thisMonth = commissionPeriodBounds("this_month", now);
assert.ok(thisMonth.start);
assert.equal(isoInPeriod("2026-09-05T16:00:00.000Z", "this_month", now), true);
assert.equal(isoInPeriod("2026-08-20T16:00:00.000Z", "this_month", now), false);
assert.equal(isoInPeriod("2026-08-20T16:00:00.000Z", "last_month", now), true);
assert.equal(isoInPeriod("2026-07-01T16:00:00.000Z", "this_quarter", now), true);
assert.equal(isoInPeriod("2026-06-01T16:00:00.000Z", "this_quarter", now), false);

function deal(partial: Partial<DealWithContact>): DealWithContact {
  return {
    id: "d1",
    owner_id: "o",
    contact_id: null,
    client_name: "Client",
    stage_id: null,
    status: "won",
    closed_at: "2026-09-10T16:00:00.000Z",
    expected_closing_date: null,
    address: "10 Oak St",
    property_type: null,
    side: "seller",
    sale_price: 400000,
    gross_commission: 12000,
    referral_pct: null,
    misc_fee: 0,
    oz_fee: 0,
    on_fmls: true,
    manual_split: false,
    kw_fee: null,
    kwri_fee: null,
    fmls_fee: null,
    tc_fee: null,
    referral_fee: null,
    lead_started_at: null,
    notes: null,
    created_at: "2026-09-01T16:00:00.000Z",
    contacts: null,
    ...partial,
  };
}

const paid = deal({ id: "paid", status: "won", closed_at: "2026-09-10T16:00:00.000Z", address: "10 Oak St" });
const pending = deal({
  id: "uc",
  status: "pending",
  closed_at: "2026-08-01T16:00:00.000Z",
  expected_closing_date: "2026-10-01T16:00:00.000Z",
  address: "20 Pine St",
  gross_commission: null,
  side: null,
});
const oldPaid = deal({ id: "old", status: "won", closed_at: "2026-06-10T16:00:00.000Z", address: "30 Elm St" });
const listings: UnderContractListing[] = [{ id: "L1", address: "654 Gillette Ave", list_price: 465000, status: "under_contract" }];

const computed = computeDeals([paid, pending, oldPaid]);
const rows = visibleCommissionRows(computed, listings, "this_month", now);
assert.ok(rows.some((r) => r.address === "10 Oak St" && r.status === "Paid" && r.stage === "Closed" && r.side === "List"));
assert.ok(rows.some((r) => r.address === "20 Pine St" && r.needsPrompt && r.status === "Pending" && r.stage === "UC"), "UC deals stay visible for the commissions prompt");
assert.ok(rows.some((r) => r.address === "654 Gillette Ave" && r.needsPrompt && r.listingId === "L1"));
assert.equal(rows.some((r) => r.address === "30 Elm St"), false, "paid deals outside the period drop out");

const kpis = commissionKpis(rows);
assert.equal(kpis.paidCount, 1);
assert.ok(kpis.pendingCount >= 2);
assert.equal(kpis.grossGci, 12000);
assert.equal(kpis.paidAmount, 12000);
assert.ok(commissionPeriodRangeLabel("this_month", now).includes("September"));

const csv = exportCommissionRows(rows);
assert.ok(csv.startsWith("Address/deal,Side,Stage,GCI,Split %,Your net,Status,Due date"));
assert.ok(csv.includes("10 Oak St"));
assert.equal(commissionExportFilename("this_month", now), "commissions-this-month-2026-09-20.csv");
assert.equal(dealPeriodDate(pending), "2026-10-01T16:00:00.000Z");

const page = read("app/(app)/commissions/page.tsx");
assert.ok(page.includes("max-w-[1400px]"), "Commissions is a desktop page, not a phone shell");
assert.ok(page.includes("PeriodFilter"));
assert.ok(page.includes("CommissionKpis"));
assert.ok(page.includes("/api/commissions/export?period="));
assert.ok(page.includes("rangeLabel") || page.includes("commissionPeriodRangeLabel"));
assert.ok(page.includes("resolveCommissionPeriod"));
assert.equal(page.includes("CapYearToggle"), false, "period filter replaces the year tabs as the primary chrome");

const table = read("components/commissions/CommissionTable.tsx");
assert.ok(table.includes("Showing"), "table footer states the filtered period");
assert.ok(table.includes("Address/deal"));
assert.ok(table.includes("Split %"));
assert.ok(table.includes("Your net"));
assert.ok(table.includes("CommissionPromptButton"));
assert.ok(table.includes("StatusChip"));
assert.ok(read("components/commissions/CommissionPromptButton.tsx").includes("Commissions prompt"));
assert.equal(table.includes("Fee breakdown"), false, "tight table, not the 18-column fee strip");

const kpisUi = read("components/commissions/CommissionKpis.tsx");
assert.ok(kpisUi.includes("Gross GCI"));
assert.ok(kpisUi.includes("Net after splits"));
assert.ok(kpisUi.includes("pendingAmount"));
assert.ok(kpisUi.includes("paidAmount"));
assert.ok(kpisUi.includes("lg:grid-cols-4"));

const periodUi = read("components/commissions/PeriodFilter.tsx");
assert.ok(periodUi.includes("<select") || periodUi.includes("select"), "period filter is a dropdown, not chip tabs");

const exportRoute = read("app/api/commissions/export/route.ts");
assert.ok(exportRoute.includes("resolveCommissionPeriod"));
assert.ok(exportRoute.includes("exportCommissionRows"));
assert.ok(exportRoute.includes("visibleCommissionRows"));

const nav = read("components/nav/nav-items.ts");
assert.ok(nav.includes('label: "Commissions"'));
assert.equal(nav.includes('label: "Bookings"'), false, "Bookings stays off More");

console.log("commission period SoT: ok");
