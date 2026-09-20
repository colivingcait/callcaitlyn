import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { formatPublicBand } from "./public-bands";

// Public OM/Marketing bands are rounded tildes, never min–max ranges.
// Run with: npx tsx lib/listings/public-bands.proof.ts

assert.equal(formatPublicBand(null), null);
assert.equal(formatPublicBand(""), null);
assert.equal(formatPublicBand("   "), null);

assert.equal(formatPublicBand("~$5,500/mo"), "~$5,500/mo");
assert.equal(formatPublicBand("~19%"), "~19%");
assert.equal(formatPublicBand("~20%"), "~20%");
assert.equal(formatPublicBand("~10%"), "~10%");

assert.equal(formatPublicBand("$5.0–5.5k/mo"), "~$5,500/mo");
assert.equal(formatPublicBand("$5.0-5.5k/mo"), "~$5,500/mo");
assert.equal(formatPublicBand("high-teens%"), "~19%");
assert.equal(formatPublicBand("high-teens to low-20s%"), "~20%");
assert.equal(formatPublicBand("low-10s%"), "~10%");

assert.equal(formatPublicBand("$60k–$65k T12 collected"), "~$65,000 T12 collected");
assert.equal(formatPublicBand("15–20% of gross"), "~18%");
assert.equal(formatPublicBand("18–22% @ 20% down / 7% / 30yr DSCR"), "~20%");
assert.equal(formatPublicBand("10–11%"), "~10%");

assert.equal(formatPublicBand("$4,800–$5,200/mo"), "~$5,200/mo");
assert.equal(formatPublicBand("13–15%"), "~15%");

const fixture = JSON.parse(readFileSync(join(process.cwd(), "lib/listings/fixtures/candace_om_sidecar_v2.json"), "utf8"));
assert.equal(fixture.public_bands.band_gross_rent, "~$5,500/mo");
assert.equal(fixture.public_bands.band_expense_load, "~19%");
assert.equal(fixture.public_bands.band_cash_on_cash, "~20%");
assert.equal(fixture.public_bands.band_cap_rate, "~10%");
assert.equal(String(fixture.public_bands.band_gross_rent).includes("–"), false);
assert.equal(String(fixture.public_bands.band_cash_on_cash).includes("to"), false);

const om = readFileSync(join(process.cwd(), "components/listings/OmDetailsForm.tsx"), "utf8");
assert.ok(om.includes("~$5,500/mo"));
assert.ok(om.includes("~19%"));
assert.ok(om.includes("~20%"));
assert.ok(om.includes("~10%"));
assert.equal(om.includes("$5.0–5.5k/mo"), false);
assert.equal(om.includes("high-teens%"), false);
assert.equal(om.includes("low-10s%"), false);

const page = readFileSync(join(process.cwd(), "app/listing/[slug]/page.tsx"), "utf8");
assert.ok(page.includes("formatPublicBand"));
assert.ok(page.includes("listing.band_gross_rent"));
assert.ok(page.includes("listing.band_cap_rate"));

console.log("public bands: ok");
