import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gatedFinancialsHaveValues } from "./gated-underwriting";
import { normalizeFinancials } from "./crm-marketing-fields";
import {
  OM_UNLOCK_STORAGE_PREFIX,
  omUnlockStorageKey,
  parseOmUnlockPayload,
  readOmUnlock,
  writeOmUnlock,
  clearOmUnlock,
} from "./om-unlock-storage";

// Unlock payload must survive a remount (server-action refresh) and must
// not treat a bare "unlocked: true" as success when there are no numbers.
// Run with: npx tsx lib/listings/om-unlock-storage.proof.ts

const store = new Map<string, string>();
(globalThis as { window?: unknown }).window = {
  sessionStorage: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  },
};

assert.equal(omUnlockStorageKey("candace"), `${OM_UNLOCK_STORAGE_PREFIX}candace`);
assert.equal(parseOmUnlockPayload(null), null);
assert.equal(parseOmUnlockPayload("nope"), null);
assert.equal(parseOmUnlockPayload({ financials: { cap_rate: "10%" } }), null, "missing unlocked:true is not a payload");

const candaceFin = normalizeFinancials({
  purchase_price: "400000",
  gross_rents: "61483.07",
  opex: "12088.18",
  cash_on_cash: "19.59",
  cap_rate: "10.30",
} as never);
assert.equal(gatedFinancialsHaveValues(candaceFin), true);

const written = writeOmUnlock("candace", { unlocked: true, financials: candaceFin, workbookUrl: "https://example.test/wb" });
assert.equal(written.unlocked, true);
assert.equal(written.financials?.cap_rate, "10.30");
assert.equal(written.workbookUrl, "https://example.test/wb");

const stored = store.get(omUnlockStorageKey("candace"));
assert.ok(stored);
assert.equal(parseOmUnlockPayload(stored)?.financials?.gross_rents, "61483.07");

clearOmUnlock("candace");
store.set(
  omUnlockStorageKey("candace"),
  JSON.stringify({ unlocked: true, financials: candaceFin, workbookUrl: null }),
);
assert.equal(readOmUnlock("candace")?.financials?.purchase_price, "400000");

const t12Only = normalizeFinancials({
  t12: [
    { label: "Gross rents (collected)", value: 61483.07 },
    { label: "Operating expenses", value: 12088.18 },
  ],
  noi: 41216.71,
  cap_rate: 10.3,
  scenarios: [{ label: "base", coc: 19.59, cash_in: "80000", debt_service: "25547.62", cash_flow: "15669.09", dscr: 1.61 }],
} as never);
assert.equal(t12Only.gross_rents, "61483.07");
assert.equal(t12Only.opex, "12088.18");
assert.equal(t12Only.net_earnings, "41216.71");
assert.equal(t12Only.noi, "41216.71");
assert.equal(t12Only.net_cash_flow, "15669.09");
assert.equal(t12Only.cash_on_cash, "19.59");
assert.equal(t12Only.dscr, "1.61");
assert.equal(gatedFinancialsHaveValues(t12Only), true);

const root = process.cwd();
const gate = readFileSync(join(root, "components/listings/om/FinancialGate.tsx"), "utf8");
assert.ok(gate.includes("writeOmUnlock(slug, next)"));
assert.equal(gate.includes("useState<ListingFinancials"), false, "financials must not live only in the remounted gate leaf");

const ctx = readFileSync(join(root, "components/listings/om/UnlockContext.tsx"), "utf8");
assert.ok(ctx.includes("applyUnlock"));
assert.ok(ctx.includes("readOmUnlock"));

console.log("om unlock storage: ok");
