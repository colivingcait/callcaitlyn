import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_PROJECTED_OPEX_NOTE,
  dataBasisFromSidecar,
  isMissingDataBasisColumnError,
  isProjectedGatedField,
  isProjectedOpex,
  parseDataBasisOpex,
  patchWithoutDataBasisColumns,
  projectedOpexNote,
  showHeroCapRate,
  writeListingPatch,
} from "./data-basis";

// Data-basis toggle: invalid/missing values are actual, and a listings
// update still commits when the new columns are not migrated yet.
// Run with: npx tsx lib/listings/data-basis.proof.ts

assert.equal(parseDataBasisOpex(undefined), "actual");
assert.equal(parseDataBasisOpex(null), "actual");
assert.equal(parseDataBasisOpex(""), "actual");
assert.equal(parseDataBasisOpex("forecast"), "actual");
assert.equal(parseDataBasisOpex("ACTUAL"), "actual");
assert.equal(parseDataBasisOpex("projected"), "projected");
assert.equal(parseDataBasisOpex(" Projected "), "projected");
assert.equal(isProjectedOpex("projected"), true);
assert.equal(isProjectedOpex(undefined), false);

assert.deepEqual(dataBasisFromSidecar(undefined), { opex: "actual", note: null });
assert.deepEqual(dataBasisFromSidecar(null), { opex: "actual", note: null });
assert.deepEqual(dataBasisFromSidecar({ opex: "nope" }), { opex: "actual", note: null });
assert.deepEqual(dataBasisFromSidecar({ opex: "projected", opex_note: "  Custom.  " }), {
  opex: "projected",
  note: "Custom.",
});
assert.deepEqual(dataBasisFromSidecar({ opex: "projected", opex_note: 4 }), { opex: "projected", note: null });

assert.equal(projectedOpexNote(null), DEFAULT_PROJECTED_OPEX_NOTE);
assert.equal(projectedOpexNote("  "), DEFAULT_PROJECTED_OPEX_NOTE);
assert.equal(projectedOpexNote("Custom pending seller T12."), "Custom pending seller T12.");
assert.match(DEFAULT_PROJECTED_OPEX_NOTE, /pending seller T12/);
assert.equal(DEFAULT_PROJECTED_OPEX_NOTE.includes("TTM"), false);
assert.equal(DEFAULT_PROJECTED_OPEX_NOTE.toLowerCase().includes("trailing twelve"), false);

assert.equal(showHeroCapRate("actual", null), true);
assert.equal(showHeroCapRate("actual", ""), true);
assert.equal(showHeroCapRate("projected", null), false);
assert.equal(showHeroCapRate("projected", "   "), false);
assert.equal(showHeroCapRate("projected", "~10%"), true);
assert.equal(showHeroCapRate("actual", "~10%"), true);

assert.equal(isProjectedGatedField("opex", "projected"), true);
assert.equal(isProjectedGatedField("noi", "projected"), true);
assert.equal(isProjectedGatedField("projected_debt_service", "projected"), true);
assert.equal(isProjectedGatedField("net_cash_flow", "projected"), true);
assert.equal(isProjectedGatedField("cap_rate", "projected"), true);
assert.equal(isProjectedGatedField("cash_on_cash", "projected"), true);
assert.equal(isProjectedGatedField("dscr", "projected"), true);
assert.equal(isProjectedGatedField("gross_rents", "projected"), false);
assert.equal(isProjectedGatedField("net_earnings", "projected"), false);
assert.equal(isProjectedGatedField("opex", "actual"), false);

assert.equal(
  isMissingDataBasisColumnError({
    code: "PGRST204",
    message: "Could not find the 'data_basis_opex' column of 'listings' in the schema cache",
  }),
  true,
);
assert.equal(
  isMissingDataBasisColumnError({
    code: "42703",
    message: 'column "data_basis_opex_note" of relation "listings" does not exist',
  }),
  true,
);
assert.equal(
  isMissingDataBasisColumnError({
    code: "23514",
    message: 'new row for relation "listings" violates check constraint "listings_data_basis_opex_check"',
  }),
  false,
);
assert.equal(isMissingDataBasisColumnError({ code: "PGRST204", message: "Could not find the 'nickname' column" }), false);

const stripped = patchWithoutDataBasisColumns({
  nickname: "Candace",
  data_basis_opex: "projected",
  data_basis_opex_note: "note",
  financials: { noi: "1" },
});
assert.deepEqual(stripped, { nickname: "Candace", financials: { noi: "1" } });

async function runWriteCases() {
  const calls: Record<string, unknown>[] = [];
  const saved = await writeListingPatch(async (patch) => {
    calls.push(patch);
    if ("data_basis_opex" in patch || "data_basis_opex_note" in patch) {
      return {
        error: {
          code: "PGRST204",
          message: "Could not find the 'data_basis_opex' column of 'listings' in the schema cache",
        },
      };
    }
    return { error: null };
  }, {
    nickname: "Candace",
    band_gross_rent: "~$5,500/mo",
    data_basis_opex: "projected",
    data_basis_opex_note: "Seller T12 still out.",
    financials: { opex: "100" },
  });
  assert.equal(saved.error, null);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].nickname, "Candace");
  assert.equal(calls[1].band_gross_rent, "~$5,500/mo");
  assert.equal("data_basis_opex" in calls[1], false);
  assert.equal("data_basis_opex_note" in calls[1], false);
  assert.deepEqual(calls[1].financials, { opex: "100" });

  const basisOnly = await writeListingPatch(async () => {
    return {
      error: {
        code: "42703",
        message: 'column "data_basis_opex" of relation "listings" does not exist',
      },
    };
  }, { data_basis_opex: "projected" });
  assert.equal(basisOnly.error, null, "saving only the basis before migration must not fail the OM save");

  const check = await writeListingPatch(async () => {
    return {
      error: {
        code: "23514",
        message: 'violates check constraint "listings_data_basis_opex_check"',
      },
    };
  }, { nickname: "Candace", data_basis_opex: "projected" });
  assert.equal(check.error?.includes("check constraint"), true);

  const other = await writeListingPatch(async () => ({ error: { message: "permission denied", code: "42501" } }), {
    nickname: "Candace",
  });
  assert.equal(other.error, "permission denied");
}

const root = process.cwd();
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...walk(path));
    else if ((path.endsWith(".ts") || path.endsWith(".tsx")) && !path.endsWith(".proof.ts")) out.push(path);
  }
  return out;
}

for (const file of [...walk(join(root, "app")), ...walk(join(root, "lib")), ...walk(join(root, "components"))]) {
  const text = readFileSync(file, "utf8");
  assert.equal(/\.select\(\s*[`'"][^`'"]*data_basis_opex/.test(text), false, `${file} must not explicitly select data_basis_opex`);
}

const migration = readFileSync(join(root, "supabase/migrations/0084_listing_data_basis_opex.sql"), "utf8");
assert.match(migration, /add column if not exists data_basis_opex text/i);
assert.match(migration, /add column if not exists data_basis_opex_note text/i);
assert.match(migration, /drop constraint if exists listings_data_basis_opex_check/i);
assert.match(migration, /data_basis_opex in \('actual', 'projected'\)/);

const page = readFileSync(join(root, "app/listing/[slug]/page.tsx"), "utf8");
const gate = readFileSync(join(root, "components/listings/om/FinancialGate.tsx"), "utf8");
const editor = readFileSync(join(root, "components/listings/OmDetailsForm.tsx"), "utf8");
assert.equal(page.includes("Vera"), false);
assert.equal(page.includes("Apply the sidecar"), false);
assert.equal(page.includes("TTM"), false);
assert.equal(gate.includes("Vera"), false);
assert.equal(gate.includes("sidecar"), false);
assert.equal(/\bT12\b/.test(gate), false, "gated copy stays free of T12; the note component supplies it");
assert.equal(gate.includes("TTM"), false);
assert.ok(page.includes("DataBasisNote"));
assert.ok(page.includes("showHeroCap"));
assert.ok(gate.includes("DataBasisNote"));
assert.ok(gate.includes("isProjectedGatedField"));
assert.ok(editor.includes("Actuals"));
assert.ok(editor.includes("Projections (pending seller T12)"));
assert.equal(editor.includes("TTM"), false);

const actions = readFileSync(join(root, "app/(app)/listings/actions.ts"), "utf8");
assert.ok(actions.includes("writeListingPatch"));
const omSave = actions.slice(actions.indexOf("export async function updateListingOmFields"), actions.indexOf("export async function applyOmSidecarToListing"));
const omApply = actions.slice(actions.indexOf("export async function applyOmSidecarToListing"), actions.indexOf("export async function updateListingFinancials"));
assert.ok(omSave.includes("writeListingPatch"));
assert.ok(omApply.includes("writeListingPatch"));
assert.equal(omSave.includes('.select("data_basis_opex"'), false);
assert.equal(omApply.includes('.select("data_basis_opex"'), false);

runWriteCases()
  .then(() => {
    console.log("data basis: ok");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
