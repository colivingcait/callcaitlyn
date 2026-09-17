import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REGISTERED_FOR_ANY_EVENT, parseContactFilterParams } from "./contact-filter-params";
import {
  EVENT_REGISTRATION_SOURCE,
  attendedContactIds,
  eventNameFromMetadata,
  hasUsablePhone,
  isAnyEventRegistrationFilter,
  isEventAttendanceSource,
  isEventRegistrationSource,
  isOutboundOutreach,
  registeredContactIds,
} from "./contact-filter-predicates";

// Guardrail for the Contacts filter-integrity P0. The UI used to label the
// empty regEvent option "Registered for: any event" while applying no
// registration predicate — inbound-call Other rows leaked in. No Supabase.
// Run with: npx tsx lib/crm/contact-filter-predicates.proof.ts

const root = join(process.cwd());
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const ASIANNA = "attendee-asianna";
const LEANDRA = "attendee-leandra";
const CALL_ONLY_A = "other-16787832577";
const CALL_ONLY_B = "other-16786892692";
const BUYER_WHO_REGISTERED = "buyer-who-also-signed-up";
const WALK_IN = "walkin-checkin-only";
const SPAM_STUB = "spam-inbound-stub";

const registrations = [
  { contactId: ASIANNA, eventName: "House Hacking ATL", source: EVENT_REGISTRATION_SOURCE },
  { contactId: LEANDRA, eventName: "Women's REI Meetup", source: EVENT_REGISTRATION_SOURCE },
  { contactId: BUYER_WHO_REGISTERED, eventName: "House Hacking ATL", source: EVENT_REGISTRATION_SOURCE },
  // Nameless Eventbrite row (API never returned a title) still counts as a signup.
  { contactId: "nameless-signup", eventName: null, source: EVENT_REGISTRATION_SOURCE },
  // These must never match a registration filter:
  { contactId: CALL_ONLY_A, eventName: null, source: "quo" },
  { contactId: CALL_ONLY_B, eventName: "House Hacking ATL", source: "quo" },
  { contactId: WALK_IN, eventName: "House Hacking ATL", source: "checkin" },
  { contactId: SPAM_STUB, eventName: null, source: "quo" },
];

assert.equal(REGISTERED_FOR_ANY_EVENT, "__any__");
assert.equal(isAnyEventRegistrationFilter(REGISTERED_FOR_ANY_EVENT), true);
assert.equal(isAnyEventRegistrationFilter("House Hacking ATL"), false);
assert.equal(isAnyEventRegistrationFilter(undefined), false);
assert.equal(isEventRegistrationSource("eventbrite"), true);
assert.equal(isEventRegistrationSource("quo"), false);
assert.equal(isEventAttendanceSource("jotform"), true);
assert.equal(isEventAttendanceSource("eventbrite"), false);

const anyIds = registeredContactIds(REGISTERED_FOR_ANY_EVENT, registrations);
assert.equal(anyIds.has(ASIANNA), true, "Eventbrite Attendee matches any-event");
assert.equal(anyIds.has(LEANDRA), true, "second Eventbrite Attendee matches any-event");
assert.equal(anyIds.has(BUYER_WHO_REGISTERED), true, "Buyer who registered still matches — type is not the predicate");
assert.equal(anyIds.has("nameless-signup"), true, "Eventbrite row with null event_name matches any-event");
assert.equal(anyIds.has(CALL_ONLY_A), false, "call-only Other must not match any-event");
assert.equal(anyIds.has(CALL_ONLY_B), false, "inbound call with a coincidental event_name must not match");
assert.equal(anyIds.has(WALK_IN), false, "walk-in check-in is attendance, not registration");
assert.equal(anyIds.has(SPAM_STUB), false, "spam/inbound stub must not match any-event");

const namedIds = registeredContactIds("House Hacking ATL", registrations);
assert.equal(namedIds.has(ASIANNA), true);
assert.equal(namedIds.has(LEANDRA), false, "other event's registrant must not match a named event");
assert.equal(namedIds.has(CALL_ONLY_A), false);
assert.equal(namedIds.has(CALL_ONLY_B), false);
assert.equal(namedIds.has("nameless-signup"), false, "null event_name does not match a named event");

assert.equal(eventNameFromMetadata({ event_name: "House Hacking ATL" }), "House Hacking ATL");
assert.equal(eventNameFromMetadata({ event_name: "  " }), null);
assert.equal(eventNameFromMetadata({}), null);
assert.equal(eventNameFromMetadata(null), null);

assert.equal(hasUsablePhone("+16787832577"), true);
assert.equal(hasUsablePhone("  "), false, "whitespace-only is not a phone");
assert.equal(hasUsablePhone(""), false);
assert.equal(hasUsablePhone(null), false);

assert.equal(isOutboundOutreach({ type: "call", direction: "outbound" }), true);
assert.equal(isOutboundOutreach({ type: "call", direction: "inbound" }), false, "inbound call is not follow-up");
assert.equal(isOutboundOutreach({ type: "meeting", direction: "outbound" }), false);

const attended = attendedContactIds(
  "Thursday meetup",
  [
    { id: ASIANNA, last_event_name: "Later meetup" },
    { id: WALK_IN, last_event_name: "Thursday meetup" },
    { id: CALL_ONLY_A, last_event_name: null },
  ],
  [
    { contactId: ASIANNA, eventName: "Thursday meetup", source: "jotform" },
    { contactId: CALL_ONLY_A, eventName: "Thursday meetup", source: "quo" },
  ],
);
assert.equal(attended.has(ASIANNA), true, "earlier attendance still matches after a later last_event_name");
assert.equal(attended.has(WALK_IN), true, "last_event_name still counts");
assert.equal(attended.has(CALL_ONLY_A), false, "a call is not attendance");

const parsedAny = parseContactFilterParams(new URLSearchParams(`regEvent=${REGISTERED_FOR_ANY_EVENT}&phone=1`));
assert.equal(parsedAny.registeredEventName, REGISTERED_FOR_ANY_EVENT);
assert.equal(parsedAny.hasPhone, true);
const parsedEmpty = parseContactFilterParams(new URLSearchParams("phone=1"));
assert.equal(parsedEmpty.registeredEventName, undefined, "missing regEvent is no registration filter");
const parsedNamed = parseContactFilterParams(new URLSearchParams("regEvent=House Hacking ATL"));
assert.equal(parsedNamed.registeredEventName, "House Hacking ATL");

const list = read("lib/data/contacts.ts");
assert.ok(list.includes("registeredContactIds("), "listContacts must use the shared registration predicate");
assert.ok(list.includes("EVENT_REGISTRATION_SOURCE"), "registration query is Eventbrite/CRM signup, not calls");
assert.equal(list.includes('eq("metadata->>event_name", filters.registeredEventName)'), false, "any-event must not require event_name");
assert.ok(list.includes("hasUsablePhone"), "phone filter uses the usable-phone predicate");
assert.ok(list.includes("attendedContactIds("), "attended filter is not last_event_name-only");
assert.ok(list.includes('.eq("spam", false)'), "Contacts list still excludes flagged spam; the fix is the predicate, not a manual mark");

const filtersUi = read("components/contacts/ContactFilters.tsx");
assert.ok(filtersUi.includes("Anyone (not filtered by registration)"), "empty option must be honest");
assert.ok(filtersUi.includes("REGISTERED_FOR_ANY_EVENT"), "any-event option uses the sentinel");
assert.ok(filtersUi.includes("Registered for: any event"), "the labeled option still exists");
const emptyOption = filtersUi.slice(filtersUi.indexOf('<option value="">'), filtersUi.indexOf("</option>") + 9);
assert.equal(emptyOption.includes("Registered for: any event"), false, "empty option must not claim any-event");

const sheet = read("components/contacts/ContactFiltersSheet.tsx");
assert.ok(sheet.includes("Anyone (not filtered by registration)"));
assert.ok(sheet.includes("REGISTERED_FOR_ANY_EVENT"));
const sheetEmpty = sheet.slice(sheet.lastIndexOf('<option value="">Anyone'), sheet.lastIndexOf('<option value="">Anyone') + 80);
assert.equal(sheetEmpty.includes("Registered for: any event"), false);

const mobile = read("components/contacts/mobile/MyLists.tsx");
assert.ok(mobile.includes("REGISTERED_FOR_ANY_EVENT"), "mobile Any event tile must hit the sentinel");

const queues = read("lib/crm/contact-queue-filter.ts");
assert.ok(queues.includes("lastOutboundAt"), "follow-up queues ignore inbound robocalls");
assert.ok(queues.includes("isOutboundOutreach"), "outbound follow-up is the shared predicate");
assert.ok(queues.includes("hasUsablePhone"), "No phone queue uses the same phone predicate");
assert.ok(queues.includes("lastEventbriteAt"), "Registered-no-follow-up still requires an Eventbrite signup");

const page = read("app/(app)/contacts/page.tsx");
assert.equal(page.includes("onSend="), false, "no Server→Client function props on Contacts");
assert.ok(page.includes("parseContactFilterParams"), "page and export share the parser");

const exportRoute = read("app/api/contacts/export/route.ts");
assert.ok(exportRoute.includes("parseContactFilterParams"), "CSV export must honor the same filters");

console.log("contact filter predicates: ok");
