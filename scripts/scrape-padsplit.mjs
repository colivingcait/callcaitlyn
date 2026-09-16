/**
 * Daily PadSplit occupancy/pricing/photo refresh for off-MLS listings.
 *
 * PadSplit blocks plain server-side requests (including from cloud/hosting
 * IP ranges like Vercel's serverless functions) with a bot-challenge page,
 * not the real listing - a real headless browser is required. Reads the
 * structured per-room data PadSplit's own Next.js app embeds in
 * `__NEXT_DATA__` rather than scraping rendered text, since that field
 * shape is far more reliable than guessing at DOM/CSS.
 *
 * Runs on a GitHub Actions schedule (.github/workflows/refresh-padsplit-listings.yml),
 * which is required rather than a nicety - PadSplit is very likely to
 * block this from Vercel's own serverless IPs the same way it blocks
 * sandboxed dev/agent environments. Writes straight to Supabase's
 * `listings` table (occupied_rooms, total_rooms, price_low, price_high,
 * padsplit_photo_urls, last_scraped_at, last_scrape_error) - there's no
 * intermediate JSON file, since the CRM's public listing pages already
 * read this table directly.
 *
 * On failure for a listing, only last_scraped_at/last_scrape_error are
 * updated - the real occupancy/price/photo data already on the row is
 * left untouched rather than zeroed out, so a transient block never makes
 * a listing look empty on the public page.
 */
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "fs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OWNER_ID = process.env.CRM_OWNER_USER_ID;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !OWNER_ID) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or CRM_OWNER_USER_ID");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const ART = "artifacts";
mkdirSync(ART, { recursive: true });

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const CHALLENGE = /just a moment|verify you are human|captcha|access denied|attention required/i;

// Pull the raw __NEXT_DATA__ blob out of the hydrated page.
async function getNextData(page) {
  return page.evaluate(() => {
    let data;
    try {
      data = window.__NEXT_DATA__;
    } catch {}
    if (!data) {
      const el = document.getElementById("__NEXT_DATA__");
      if (el) {
        try {
          data = JSON.parse(el.textContent || "{}");
        } catch {}
      }
    }
    return data || null;
  });
}

// Pattern-match on shape rather than a fixed path - PadSplit's internal
// data shape shifts, but an array where every element has both roomNumber
// and amenities is reliably the room list wherever it sits in the tree.
function findRooms(node, depth = 0, seen = new Set()) {
  if (!node || typeof node !== "object" || depth > 16 || seen.has(node)) return null;
  seen.add(node);
  if (Array.isArray(node)) {
    if (node.length && node.every((x) => x && typeof x === "object") && node[0].roomNumber !== undefined && node[0].amenities) {
      return node;
    }
    for (const x of node) {
      const found = findRooms(x, depth + 1, seen);
      if (found) return found;
    }
    return null;
  }
  for (const value of Object.values(node)) {
    const found = findRooms(value, depth + 1, seen);
    if (found) return found;
  }
  return null;
}

// Any object with a string `location` URL alongside a `category` key is a
// photo record (room and common-area photos both use this shape).
function findPhotos(node, depth = 0, seen = new Set(), out = [], urlsSeen = new Set()) {
  if (!node || typeof node !== "object" || depth > 18 || seen.has(node)) return out;
  seen.add(node);
  if (Array.isArray(node)) {
    for (const x of node) findPhotos(x, depth + 1, seen, out, urlsSeen);
    return out;
  }
  if (typeof node.location === "string" && /^https?:\/\//.test(node.location) && "category" in node) {
    if (!urlsSeen.has(node.location)) {
      urlsSeen.add(node.location);
      out.push(node.location);
    }
  }
  for (const value of Object.values(node)) findPhotos(value, depth + 1, seen, out, urlsSeen);
  return out;
}

async function scrapeListing(context, listing) {
  const page = await context.newPage();
  try {
    let status = null;
    let hydrated = false;
    let text = "";
    let title = "";

    for (let attempt = 1; attempt <= 3; attempt++) {
      const resp = await page.goto(listing.padsplit_url, { waitUntil: "domcontentloaded", timeout: 60000 });
      status = resp ? resp.status() : null;
      hydrated = await page
        .waitForFunction(
          () => {
            const d = window.__NEXT_DATA__;
            return !!d && JSON.stringify(d).includes("roomNumber");
          },
          { timeout: 15000 },
        )
        .then(() => true)
        .catch(() => false);
      await page.waitForTimeout(1000);
      text = await page.evaluate(() => document.body?.innerText || "");
      title = (await page.title()).replace(/\s*\|\s*PadSplit\s*$/i, "").trim();
      if (hydrated || CHALLENGE.test(text) || (status && status >= 400)) break;
      if (attempt < 3) await page.waitForTimeout(1500);
    }

    const html = await page.content();
    writeFileSync(`${ART}/listing-${listing.id}.html`, html);
    await page.screenshot({ path: `${ART}/listing-${listing.id}.png`, fullPage: true }).catch(() => {});

    if (CHALLENGE.test(text) || (status && status >= 400)) {
      throw new Error(`PadSplit blocked or errored (status ${status})`);
    }
    if (!hydrated) {
      throw new Error(`Listing page never rendered real data (title: "${title}")`);
    }

    const data = await getNextData(page);
    const rooms = findRooms(data) ?? [];
    if (rooms.length === 0) throw new Error("Page hydrated but no room data was found in it");

    const photoUrls = findPhotos(data).slice(0, 12);

    const rates = rooms
      .map((r) => r.totalPromoAmount ?? r.totalWeeklyRate ?? r.basePrice ?? null)
      .filter((n) => typeof n === "number" && Number.isFinite(n));

    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter((r) => r.status !== 1).length;
    const priceLow = rates.length ? Math.min(...rates) : null;
    const priceHigh = rates.length ? Math.max(...rates) : null;

    return { ok: true, totalRooms, occupiedRooms, priceLow, priceHigh, photoUrls };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    await page.close();
  }
}

const { data: listings, error: fetchError } = await supabase
  .from("listings")
  .select("id, address, padsplit_url")
  .eq("owner_id", OWNER_ID)
  .not("padsplit_url", "is", null);

if (fetchError) {
  console.error("Couldn't load listings from Supabase:", fetchError.message);
  process.exit(1);
}

if (!listings || listings.length === 0) {
  console.log("No listings have a PadSplit URL set - nothing to do.");
  process.exit(0);
}

const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"] });
const context = await browser.newContext({ userAgent: UA, locale: "en-US", timezoneId: "America/New_York", viewport: { width: 1280, height: 1800 } });

let okCount = 0;
for (const listing of listings) {
  const result = await scrapeListing(context, listing);
  const now = new Date().toISOString();

  if (result.ok) {
    await supabase
      .from("listings")
      .update({
        occupied_rooms: result.occupiedRooms,
        total_rooms: result.totalRooms,
        price_low: result.priceLow,
        price_high: result.priceHigh,
        padsplit_photo_urls: result.photoUrls,
        last_scraped_at: now,
        last_scrape_error: null,
      })
      .eq("id", listing.id);
    okCount++;
    console.log(`✓ ${listing.address}: ${result.occupiedRooms}/${result.totalRooms} occupied, $${result.priceLow}-$${result.priceHigh}/wk`);
  } else {
    // Carry forward - only the scrape bookkeeping changes, real data stays.
    await supabase.from("listings").update({ last_scraped_at: now, last_scrape_error: result.error }).eq("id", listing.id);
    console.log(`✗ ${listing.address}: ${result.error}`);
  }
}

await browser.close();
console.log(`\n==== ${okCount}/${listings.length} listings refreshed ====`);
if (okCount === 0) process.exit(2);
