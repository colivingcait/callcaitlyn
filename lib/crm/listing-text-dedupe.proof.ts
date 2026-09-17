import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { toE164 } from "../phone";
import {
  dedupeListingTextRecipients,
  isListingTextPhoneQueued,
  listingTextOutboundE164s,
  listingTextPhoneKey,
  pickCanonicalListingTextRecipient,
  queuedListingTextPhoneKeys,
} from "./listing-text-dedupe";

// Local proof that duplicate RP phones collapse to one outbound. No Supabase.
// Run with:
//   npx tsx lib/crm/listing-text-dedupe.proof.ts

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

assert.equal(listingTextPhoneKey("(404) 555-1212"), "4045551212");
assert.equal(listingTextPhoneKey("404-555-1212"), "4045551212");
assert.equal(listingTextPhoneKey("4045551212"), "4045551212");
assert.equal(listingTextPhoneKey("+1 404 555 1212"), "4045551212");
assert.equal(listingTextPhoneKey("+14045551212"), "4045551212");
assert.equal(toE164("(404) 555-1212"), "+14045551212");
assert.equal(toE164("+1 404-555-1212"), "+14045551212");

const triple = [
  { id: "buyer-1", name: "4045551212", phone: "(404) 555-1212" },
  { id: "buyer-2", name: "Jamie Lee", phone: "404-555-1212" },
  { id: "buyer-3", name: "", phone: "+1 404 555 1212" },
];

const collapsed = dedupeListingTextRecipients(triple);
assert.equal(collapsed.length, 1);
assert.equal(collapsed[0].id, "buyer-2");
assert.equal(collapsed[0].name, "Jamie Lee");
assert.deepEqual(listingTextOutboundE164s(triple), ["+14045551212"]);

const namedOverBare = pickCanonicalListingTextRecipient(
  { name: "555-1212", phone: "4045551212" },
  { name: "Alex Rivera", phone: "(404) 555-1212" },
);
assert.equal(namedOverBare.name, "Alex Rivera");

const firstNamedWins = pickCanonicalListingTextRecipient(
  { name: "Alex Rivera", phone: "4045551212" },
  { name: "Jamie Lee", phone: "4045551212" },
);
assert.equal(firstNamedWins.name, "Alex Rivera");

const twoNumbers = dedupeListingTextRecipients([
  { id: "a", name: "Alex", phone: "(404) 555-1212" },
  { id: "b", name: "Alex", phone: "4045551212" },
  { id: "c", name: "Sam", phone: "770-555-0100" },
]);
assert.equal(twoNumbers.length, 2);
assert.deepEqual(
  listingTextOutboundE164s(twoNumbers),
  ["+14045551212", "+17705550100"],
);

const queuedIds = new Set(["buyer-1"]);
const queuedPhones = queuedListingTextPhoneKeys(triple, queuedIds);
assert.equal(queuedPhones.has("4045551212"), true);
const held = triple.filter((row) => queuedIds.has(row.id) || isListingTextPhoneQueued(row.phone, queuedPhones));
assert.equal(held.length, 3);
const stillSendable = triple.filter((row) => !queuedIds.has(row.id) && !isListingTextPhoneQueued(row.phone, queuedPhones));
assert.equal(stillSendable.length, 0);
assert.deepEqual(listingTextOutboundE164s(stillSendable), []);

const composer = read("components/listings/AgentComposer.tsx");
assert.ok(composer.includes("dedupeListingTextRecipients"), "Fresh/Recent lists collapse duplicate phones");
assert.ok(composer.includes("queuedListingTextPhoneKeys"), "a queued row holds every copy of that number");
assert.ok(composer.includes("listingAgentIds: (channel === \"text\" ? bucketAgents : uniqueSendable).map((a) => a.id)"));

const actions = read("app/(app)/listings/actions.ts");
assert.ok(actions.includes("dedupeListingTextRecipients"), "createListingSend collapses before insert");
assert.ok(actions.includes("if (input.channel === \"text\") recipients = dedupeListingTextRecipients(recipients)"), "text path still phone-dedupes after identity collapse");

const sends = read("lib/crm/listing-sends.ts");
assert.ok(sends.includes("Duplicate phone"), "worker skips a second outbound to the same number on one send");

const page = read("app/(app)/listings/[id]/page.tsx");
assert.equal(page.includes("onSend="), false, "no function props from the listing server page into AgentComposer");

console.log("listing text phone dedupe: ok");
