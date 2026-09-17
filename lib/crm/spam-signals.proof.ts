import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ALL_SPAM_RULE_REASONS,
  TOLL_FREE_CALLBACK_REASON,
  detectSpam,
  isTollFreeCallbackPitch,
  type SpamCheckInput,
} from "./spam-signals";

// Phrase-pattern proof for Caitlyn's P0 spam rules (opt-out + 8xx callback)
// plus a regression lock on PR #3's `spam=false` worklist filters. No DB.
//   npx tsx lib/crm/spam-signals.proof.ts

function fromTranscript(transcript: string, extra?: Partial<SpamCheckInput>) {
  return detectSpam({
    summary: null,
    transcript,
    durationSeconds: 18,
    status: "voicemail",
    hasVoicemail: true,
    ...extra,
  });
}

function fromBody(body: string) {
  return detectSpam({
    summary: null,
    transcript: null,
    body,
    durationSeconds: 8,
    status: "completed",
    hasVoicemail: false,
  });
}

// --- Opt-out: any reasonable casing / punctuation ---
const OPT_OUT_PHRASES = [
  "Press 9 to opt out of future calls.",
  "To OPT-OUT, visit our website.",
  "Reply optout anytime.",
  "Please OPT OUT.",
  "opt. out of these recordings",
  "You may opt_out at any time",
  "press 9 to Opt-Out",
];

for (const phrase of OPT_OUT_PHRASES) {
  const result = fromTranscript(phrase);
  assert.equal(result.isSpam, true, `opt-out must flag: ${phrase}`);
  assert.equal(result.reason, "Robocall opt-out script", `opt-out reason for: ${phrase}`);
}

assert.equal(fromBody("Missed · To opt out press 9").isSpam, true, "opt-out in call body still flags");
assert.equal(fromTranscript("We stepped out for a showing, call me later.").isSpam, false, `"stepped out" is not opt-out`);
assert.equal(fromTranscript("The option on the house expires Friday.").isSpam, false, `"option" is not opt-out`);

// --- Toll-free 8xx callback pitch ---
const TOLL_FREE_PHRASES = [
  "Please call this 877 number back",
  "Call us back at 877-555-0100",
  "call this 877 number back when you have a moment",
  "Call us back at 1 (800) 555-1212",
  "give us a call at 888.555.1212",
  "Please dial 855 123 4567 to reach us",
  "CALL US BACK AT 833-000-1111",
  "reach us at 1-866-555-0199",
];

for (const phrase of TOLL_FREE_PHRASES) {
  assert.equal(isTollFreeCallbackPitch(phrase), true, `8xx helper must match: ${phrase}`);
  const result = fromTranscript(phrase);
  assert.equal(result.isSpam, true, `8xx callback must flag: ${phrase}`);
  assert.equal(result.reason, TOLL_FREE_CALLBACK_REASON, `8xx reason for: ${phrase}`);
}

assert.equal(fromBody("voicemail: call this 877 number back").reason, TOLL_FREE_CALLBACK_REASON);

// Local NANP NXX that happens to be 877 (Atlanta 404-877-xxxx) is not toll-free.
const LOCAL_EIGHT_HUNDRED = "Hi Caitlyn, it's Jordan at 404-877-1212, call me back about the showing.";
assert.equal(isTollFreeCallbackPitch(LOCAL_EIGHT_HUNDRED), false, "404-877-xxxx is a local number");
assert.equal(fromTranscript(LOCAL_EIGHT_HUNDRED).isSpam, false, "local 877 NXX must not flag a real lead");
assert.equal(
  fromTranscript("I'm at 770-877-0000 please call me about the listing.").isSpam,
  false,
  "770-877-xxxx is local, not toll-free",
);
assert.equal(fromTranscript("Loved the open house, call me tomorrow.").isSpam, false);
assert.equal(
  fromTranscript("Call me, I live at 877 Peachtree.").isSpam,
  false,
  "street number 877 without 'number'/10-digit form is not a callback pitch",
);

assert.equal(
  ALL_SPAM_RULE_REASONS.includes(TOLL_FREE_CALLBACK_REASON),
  true,
  "Settings toggle list includes the 8xx rule",
);
assert.equal(
  ALL_SPAM_RULE_REASONS.includes("Robocall opt-out script"),
  true,
  "Settings toggle list still includes opt-out",
);

// Disabled-reason skip still works for the new rule.
assert.equal(
  fromTranscript("call us back at 877-555-0100", {
    disabledReasons: new Set([TOLL_FREE_CALLBACK_REASON]),
  }).isSpam,
  false,
  "disabled 8xx rule must not flag",
);

// --- PR #3 query-filter regression: worklists still require spam=false ---
const root = join(process.cwd());
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const todayData = read("lib/data/today.ts");
assert.ok(todayData.includes('.eq("spam", false)'), "Today contact queries filter spam=false");
assert.ok(todayData.includes('.eq("contacts.spam", false)'), "Today activity joins filter contacts.spam=false");

function assertFnFiltersSpam(src: string, fnName: string, needle: string) {
  const start = src.indexOf(`async function ${fnName}`);
  assert.ok(start >= 0, `${fnName} exists`);
  const next = src.indexOf("\nasync function ", start + 1);
  const body = next >= 0 ? src.slice(start, next) : src.slice(start);
  assert.ok(body.includes(needle), `${fnName} must keep ${needle}`);
}

assertFnFiltersSpam(todayData, "getCallsGroup", '.eq("spam", false)');
assertFnFiltersSpam(todayData, "getRepliesOwedGroup", '.eq("contacts.spam", false)');
assertFnFiltersSpam(todayData, "getQuietLeadsGroup", '.eq("contacts.spam", false)');
assertFnFiltersSpam(todayData, "getStatStrip", '.eq("spam", false)');

const newLeads = read("lib/data/new-leads.ts");
assert.ok(newLeads.includes('.eq("spam", false)'), "New/uncontacted queue filters spam");

const contactsData = read("lib/data/contacts.ts");
assert.ok(contactsData.includes('.eq("spam", false)'), "People list filters spam");

const layout = read("app/(app)/layout.tsx");
assert.ok(layout.includes('.eq("spam", false)'), "Nav contact count filters spam");

const webhook = read("app/api/webhooks/quo/route.ts");
assert.ok(webhook.includes("checkCallForSpam"), "Quo ingest still classifies calls");
assert.ok(webhook.includes("spam: spamCheck.isSpam"), "Call ingest stamps spam on create");
assert.ok(webhook.includes("checkTextForSpam"), "Inbound texts run the same classifier");
assert.ok(webhook.includes("spam: true"), "Spam contacts get the durable flag");

const findOrCreate = read("lib/crm/find-or-create-contact.ts");
assert.ok(findOrCreate.includes("spam?: boolean"), "findOrCreateContact can insert already-flagged");
assert.ok(findOrCreate.includes("!input.spam"), "spam rows skip the Quo contact upsert");

console.log("spam opt-out + 8xx callback + spam=false filters: ok");
