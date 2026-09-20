import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { capYearKey, capYearLabel, listCapYears, resolveCapYearQuery } from "./commission";
import type { Deal } from "@/types/database";

function utc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day, 15, 0, 0));
}

function deal(closedAt: Date): Deal {
  return { closed_at: closedAt.toISOString() } as Deal;
}

// Label, query param, and computed capYear are the same calendar year.
assert.equal(capYearKey(utc(2025, 0, 15)), "2025");
assert.equal(capYearLabel("2025"), "2025");
assert.equal(capYearKey(utc(2024, 11, 15)), "2025", "Dec 2024 is still the 2025 KW year");
assert.equal(capYearKey(utc(2025, 10, 15)), "2025", "Nov 2025 is still the 2025 KW year");
assert.equal(capYearKey(utc(2025, 11, 15)), "2026", "Dec 2025 starts the extended 2026 year");
assert.equal(capYearKey(utc(2026, 8, 18)), "2026");
assert.equal(capYearLabel("2026"), "2026");
assert.equal(capYearKey(utc(2027, 0, 1)), "2027");
assert.equal(capYearLabel("2027"), "2027");

const years = listCapYears([deal(utc(2025, 5, 1)), deal(utc(2026, 2, 1))]);
assert.ok(years.includes("2025"));
assert.ok(years.includes("2026"));
assert.equal(years.includes("2024"), false, "legacy start-year key 2024 is not a selectable year");

assert.equal(resolveCapYearQuery("2025", years), "2025");
assert.equal(resolveCapYearQuery("2024", years), "2025", "old ?year=2024 bookmarks map to the 2025 tab");
assert.equal(resolveCapYearQuery("2026", years), "2026");

const root = join(process.cwd());
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const toggle = read("components/commissions/CapYearToggle.tsx");
assert.ok(toggle.includes("href={`/commissions?year=${year}`}"), "tab href uses the year key");
assert.ok(toggle.includes("{capYearLabel(year)}"), "tab label uses capYearLabel of that same key");

const page = read("app/(app)/commissions/page.tsx");
assert.ok(page.includes("computeDeals"), "commissions still walks deals through the KW/KWRI cap math");
assert.equal(page.includes("CapYearToggle"), false, "period filter is the page chrome; cap-year tabs are no longer primary");

const commission = read("lib/crm/commission.ts");
assert.ok(commission.includes("return `${startYear + 1}`") || commission.includes("startYear + 1"), "pre-2026 keys are the dominant calendar year, not Dec-start year");

console.log("commission year label↔query↔data: ok");
