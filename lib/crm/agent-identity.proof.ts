import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  agentIdentityRichness,
  clusterAgentsByIdentity,
  collapseListingAgents,
  dedupeAgentsByIdentity,
  normalizeAgentEmail,
  normalizeAgentName,
  pickRichestAgentIdentity,
  selectListingSendRecipients,
} from "./agent-identity";

// Local proof that listing RP lists and the agent directory collapse to
// one row per person (phone / email / name-only). No Supabase.
// Run with:
//   npx tsx lib/crm/agent-identity.proof.ts

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

assert.equal(normalizeAgentEmail("  Jamie.Lee@Compass.COM "), "jamie.lee@compass.com");
assert.equal(normalizeAgentEmail("not-an-email"), null);
assert.equal(normalizeAgentName("  JOHN   SMITH "), "john smith");
assert.equal(normalizeAgentName("4045551212"), null);
assert.equal(normalizeAgentName(""), null);

assert.equal(agentIdentityRichness({ name: "Jamie Lee", phone: "4045551212", email: "j@x.com" }), 8);
assert.equal(agentIdentityRichness({ name: "Jamie Lee", phone: "4045551212", email: null }), 6);
assert.equal(agentIdentityRichness({ name: "4045551212", phone: "4045551212", email: null }), 2);

const richest = pickRichestAgentIdentity(
  { id: "bare", name: "4045551212", phone: "(404) 555-1212", email: null },
  { id: "full", name: "Jamie Lee", phone: "404-555-1212", email: "jamie@compass.com" },
);
assert.equal(richest.id, "full");

// Same phone, three buyer-ref rows → one person. Named+email row wins and
// keeps the first-in-order id when richness ties later.
const samePhone = dedupeAgentsByIdentity([
  { id: "buyer-1", name: "4045551212", phone: "(404) 555-1212", email: null, state: "not_contacted" as const },
  { id: "buyer-2", name: "Jamie Lee", phone: "404-555-1212", email: "jamie@compass.com", state: "not_contacted" as const },
  { id: "buyer-3", name: "", phone: "+1 404 555 1212", email: null, state: "not_contacted" as const },
]);
assert.equal(samePhone.length, 1);
assert.equal(samePhone[0].id, "buyer-2");
assert.equal(samePhone[0].name, "Jamie Lee");
assert.equal(samePhone[0].email, "jamie@compass.com");

// Same email, different punctuation/case → one row. The row with name +
// phone + email is richer than name + email alone.
const sameEmail = dedupeAgentsByIdentity([
  { id: "e1", name: "Alex Rivera", phone: null, email: "Alex@Broker.COM", brokerage: null },
  { id: "e2", name: "A Rivera", phone: "770-555-0100", email: "alex@broker.com", brokerage: "Compass" },
]);
assert.equal(sameEmail.length, 1);
assert.equal(sameEmail[0].id, "e2");
assert.equal(sameEmail[0].phone, "770-555-0100");
assert.equal(sameEmail[0].email, "alex@broker.com");
assert.equal(sameEmail[0].brokerage, "Compass");

// Empty fields on the canonical row are filled from siblings.
const filledFromSibling = dedupeAgentsByIdentity([
  { id: "named", name: "Alex Rivera", phone: "770-555-0100", email: null, brokerage: null },
  { id: "emailed", name: "", phone: "770-555-0100", email: "alex@broker.com", brokerage: "Compass" },
]);
assert.equal(filledFromSibling.length, 1);
assert.equal(filledFromSibling[0].id, "named");
assert.equal(filledFromSibling[0].name, "Alex Rivera");
assert.equal(filledFromSibling[0].email, "alex@broker.com");
assert.equal(filledFromSibling[0].brokerage, "Compass");

// Same name, both with no contact info → one row.
const sameNameNoContact = dedupeAgentsByIdentity([
  { id: "n1", name: "Jordan Kim", phone: null, email: null },
  { id: "n2", name: "  jordan   kim ", phone: "", email: "  " },
]);
assert.equal(sameNameNoContact.length, 1);
assert.equal(sameNameNoContact[0].id, "n1");

// Conservative name rule: "John Smith" with a phone does not merge with
// a name-only "John Smith", and two John Smiths with different numbers
// stay two people.
const johns = dedupeAgentsByIdentity([
  { id: "js-phone", name: "John Smith", phone: "(404) 555-1212", email: null },
  { id: "js-empty", name: "John Smith", phone: null, email: null },
  { id: "js-other", name: "John Smith", phone: "770-555-0100", email: null },
  { id: "js-email", name: "John Smith", phone: null, email: "john@other.com" },
]);
assert.equal(johns.length, 4);

// Different people stay separate.
const different = dedupeAgentsByIdentity([
  { id: "a", name: "Alex Rivera", phone: "(404) 555-1212", email: "alex@a.com" },
  { id: "b", name: "Sam Patel", phone: "770-555-0100", email: "sam@b.com" },
]);
assert.equal(different.length, 2);
assert.deepEqual(different.map((r) => r.id), ["a", "b"]);

// Phone + email chain is the same person (A shares phone with B, B shares
// email with C) without requiring a name match.
const chained = clusterAgentsByIdentity([
  { id: "a", name: "Jamie", phone: "4045551212", email: null },
  { id: "b", name: "", phone: "(404) 555-1212", email: "jamie@x.com" },
  { id: "c", name: "J Lee", phone: null, email: "JAMIE@x.com" },
]);
assert.equal(chained.length, 1);
assert.equal(chained[0].length, 3);

// Listing collapse: opted-out sibling wins so a duplicate ref cannot be
// texted, and a reply is not lost.
const collapsed = collapseListingAgents([
  { id: "r1", name: "Jamie Lee", phone: "4045551212", email: "jamie@x.com", state: "not_contacted" as const, replied_at: null },
  { id: "r2", name: "Jamie", phone: "404-555-1212", email: null, state: "replied" as const, replied_at: "2026-09-16T12:00:00.000Z" },
]);
assert.equal(collapsed.length, 1);
assert.equal(collapsed[0].state, "replied");
assert.equal(collapsed[0].replied_at, "2026-09-16T12:00:00.000Z");

const opted = collapseListingAgents([
  { id: "o1", name: "Sam", phone: "7705550100", email: "sam@x.com", state: "not_contacted" as const },
  { id: "o2", name: "Sam Patel", phone: "770-555-0100", email: null, state: "opted_out" as const },
]);
assert.equal(opted[0].state, "opted_out");
assert.equal(opted[0].name, "Sam");
assert.equal(opted[0].email, "sam@x.com");

const always = () => true;
const sendText = selectListingSendRecipients(
  [
    { id: "t1", name: "4045551212", phone: "(404) 555-1212", email: null, state: "not_contacted" as const },
    { id: "t2", name: "Jamie Lee", phone: "404-555-1212", email: "jamie@x.com", state: "not_contacted" as const },
    { id: "t3", name: "Sam", phone: "770-555-0100", email: "sam@x.com", state: "not_contacted" as const },
  ],
  { channel: "text", audienceFilter: always },
);
assert.equal(sendText.length, 2);
assert.equal(sendText[0].id, "t2");
assert.equal(sendText[1].id, "t3");

const sendEmail = selectListingSendRecipients(
  [
    { id: "m1", name: "Jamie", phone: "4045551212", email: null, state: "not_contacted" as const },
    { id: "m2", name: "Jamie Lee", phone: "404-555-1212", email: "jamie@x.com", state: "not_contacted" as const },
  ],
  { channel: "email", audienceFilter: always },
);
assert.equal(sendEmail.length, 1);
assert.equal(sendEmail[0].id, "m2");
assert.equal(sendEmail[0].email, "jamie@x.com");

const skippedOptOut = selectListingSendRecipients(
  [
    { id: "s1", name: "Jamie", phone: "4045551212", email: "jamie@x.com", state: "not_contacted" as const },
    { id: "s2", name: "Jamie Lee", phone: "4045551212", email: "jamie@x.com", state: "opted_out" as const },
  ],
  { channel: "text", audienceFilter: always },
);
assert.equal(skippedOptOut.length, 0);

const allowed = selectListingSendRecipients(
  [
    { id: "fresh", name: "Jamie", phone: "4045551212", email: null, state: "not_contacted" as const },
    { id: "sibling", name: "Jamie Lee", phone: "404-555-1212", email: "jamie@x.com", state: "not_contacted" as const },
    { id: "other", name: "Sam", phone: "7705550100", email: "sam@x.com", state: "not_contacted" as const },
  ],
  { channel: "text", audienceFilter: always, allowedIds: new Set(["fresh"]) },
);
assert.equal(allowed.length, 1);
assert.equal(allowed[0].id, "sibling");

const listingsData = read("lib/data/listings.ts");
assert.ok(listingsData.includes("collapseListingAgents"), "listing detail + index collapse RP people");
assert.ok(listingsData.includes("clusterAgentsByIdentity"), "agent directory collapses by identity");

const page = read("app/(app)/listings/[id]/page.tsx");
assert.ok(page.includes("collapseListingAgents"), "RP UI lists use collapsed people, not raw buyer-ref rows");
assert.equal(page.includes("onSend="), false, "no function props from the listing server page into AgentComposer");

const agentsList = read("components/listings/AgentsList.tsx");
assert.ok(agentsList.includes("collapseListingAgents"), "the RP list cards collapse duplicates too");

const composer = read("components/listings/AgentComposer.tsx");
assert.ok(composer.includes("collapseListingAgents"), "composer collapses email + text audiences");
assert.ok(composer.includes("dedupeListingTextRecipients"), "text path still phone-dedupes as defense in depth");

const actions = read("app/(app)/listings/actions.ts");
assert.ok(actions.includes("selectListingSendRecipients"), "createListingSend identity-collapses before insert");
assert.ok(actions.includes("dedupeListingTextRecipients"), "text send still phone-dedupes after identity collapse");
assert.ok(actions.includes("phonesMatch"), "directory upsert matches phone, not only email");

const sends = read("lib/crm/listing-sends.ts");
assert.ok(sends.includes("Duplicate phone"), "worker skips a second outbound to the same number on one send");
assert.ok(sends.includes("Duplicate email"), "worker skips a second outbound to the same email on one send");
assert.ok(sends.includes("normalizeAgentEmail"), "email skip uses the same normalized email key as list collapse");

const recency = read("lib/data/listing-outbound-texts.ts");
assert.ok(recency.includes("relatedIdToTargets.get(row.listing_agent_id)"), "a queued sibling holds the whole identity");

console.log("agent identity list dedupe: ok");
