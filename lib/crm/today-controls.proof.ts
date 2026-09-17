import assert from "node:assert/strict";
import { FOCUS_TO_CHIP, parseTodayFocus, todayFocusHref, TODAY_FOCUS_KEYS, TODAY_QUEUE_SWITCHER } from "./today-focus";
import { isQuoAutoCreatedStub, isSpamLikeMissedCall, isTodayWorkContact, isUnknownCallerContact } from "./today-eligible";
import { hasPlaceholderName } from "./merge-fields";

// Local proof that New/uncontacted is a real focus, and that realtor
// robocall stubs cannot enter Today work queues. No Supabase. Run with:
//   npx tsx lib/crm/today-controls.proof.ts

const stub = {
  first_name: "+16785551212",
  last_name: "",
  phone: "+16785551212",
  lead_source: "Quo (auto-created from inbound call)",
  spam: false,
};

assert.equal(parseTodayFocus("new"), "new");
assert.equal(FOCUS_TO_CHIP.new, "newUncontacted");
assert.equal(todayFocusHref("new"), "/?focus=new");
assert.ok(TODAY_QUEUE_SWITCHER.includes("new"));
assert.equal(parseTodayFocus("nope"), undefined);
assert.equal(parseTodayFocus(undefined), undefined);

for (const key of TODAY_FOCUS_KEYS) {
  assert.equal(parseTodayFocus(key), key);
  assert.equal(todayFocusHref(key), `/?focus=${key}`);
}

assert.equal(hasPlaceholderName(stub), true);
assert.equal(isUnknownCallerContact(stub), true);
assert.equal(isQuoAutoCreatedStub(stub), true);
assert.equal(isTodayWorkContact(stub), false);
assert.equal(
  isSpamLikeMissedCall(stub, { type: "call", direction: "inbound", metadata: { status: "missed" } }),
  true,
);
assert.equal(
  isSpamLikeMissedCall(
    { first_name: "Sarah", last_name: "Mitchell", phone: "4045551212", spam: false },
    { type: "call", direction: "inbound", metadata: { status: "missed" } },
  ),
  false,
);
assert.equal(
  isSpamLikeMissedCall(
    { first_name: "Sarah", last_name: "Mitchell", phone: "4045551212", spam: true },
    { type: "call", direction: "inbound", metadata: { status: "missed" } },
  ),
  true,
);
assert.equal(isSpamLikeMissedCall(stub, { type: "text", direction: "inbound", metadata: {} }), false);
assert.equal(isTodayWorkContact({ first_name: "Jordan", last_name: "Lee", spam: false }), true);

console.log("today controls + spam eligibility: ok");
