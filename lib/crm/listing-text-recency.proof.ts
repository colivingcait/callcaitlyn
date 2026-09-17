import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { clampRecentTextDays, isRecentOutboundText, listingTextBucket, neverOutboundTexted, DEFAULT_RECENT_TEXT_DAYS } from "./listing-text-recency";

// Local proof for the Fresh vs Recent split. No Supabase. Run with:
//   npx tsx lib/crm/listing-text-recency.proof.ts

const root = join(process.cwd());
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const day = 24 * 60 * 60 * 1000;
const now = Date.parse("2026-09-17T18:00:00.000Z");

assert.equal(DEFAULT_RECENT_TEXT_DAYS, 2);
assert.equal(clampRecentTextDays(0), 1);
assert.equal(clampRecentTextDays(2.9), 2);
assert.equal(clampRecentTextDays(400), 90);
assert.equal(clampRecentTextDays(Number.NaN), 2);

assert.equal(neverOutboundTexted(null), true);
assert.equal(neverOutboundTexted(undefined), true);
assert.equal(neverOutboundTexted("2026-09-16T12:00:00.000Z"), false);

assert.equal(listingTextBucket(null, 2, now), "fresh");
assert.equal(listingTextBucket("2026-09-10T18:00:00.000Z", 2, now), "fresh");
assert.equal(listingTextBucket("2026-09-16T12:00:00.000Z", 2, now), "recent");
assert.equal(listingTextBucket("2026-09-16T12:00:00.000Z", 1, now), "fresh");
assert.equal(isRecentOutboundText("2026-09-16T18:00:00.000Z", 1, now), true);

// Changing N re-buckets immediately (same timestamps, different window).
const yesterday = new Date(now - day).toISOString();
assert.equal(listingTextBucket(yesterday, 1, now), "recent");
assert.equal(listingTextBucket(yesterday, 2, now), "recent");
const threeDaysAgo = new Date(now - 3 * day).toISOString();
assert.equal(listingTextBucket(threeDaysAgo, 2, now), "fresh");
assert.equal(listingTextBucket(threeDaysAgo, 3, now), "recent");
assert.equal(listingTextBucket(threeDaysAgo, 5, now), "recent");

const query = read("lib/data/listing-outbound-texts.ts");
assert.ok(query.includes('from("listing_send_recipients")'), "blast send timestamps come from listing_send_recipients");
assert.ok(query.includes("listing_sends!inner"), "text channel is via listing_sends, not a new table");
assert.ok(query.includes('from("listing_agent_messages")'), "1:1 agent SMS uses listing_agent_messages");
assert.ok(query.includes('from("activities")'), "contact-thread SMS uses activities");
assert.ok(query.includes('.eq("source", "quo")'), "contact SMS is Quo outbound only");
assert.ok(query.includes('.eq("direction", "outbound")'), "inbound texts do not count as Recent");

const page = read("app/(app)/listings/[id]/page.tsx");
assert.ok(page.includes("lastOutboundAtByAgentId={textRecency.lastOutboundAtByAgentId}"));
assert.ok(page.includes("queuedOnThisListing={textRecency.queuedOnThisListing}"));
assert.equal(page.includes("onSend="), false, "no function props from the listing server page into AgentComposer");

const composer = read("components/listings/AgentComposer.tsx");
assert.ok(composer.includes("Flag anyone I texted in the last"));
assert.ok(composer.includes("listingAgentIds: channel === \"text\" ? bucketAgents.map((a) => a.id) : undefined"));
assert.ok(composer.includes("Not texted in last"));
assert.ok(composer.includes("Texted in last"));

console.log("listing text recency: ok");
