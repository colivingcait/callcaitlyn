import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  NOT_FILTERED_BY_REGISTRATION,
  REGISTERED_FOR_ANY_EVENT,
  parseContactFilterParams,
  registrationSelectValue,
  resolveRegisteredEventName,
} from "./contact-filter-params";
import {
  EVENT_REGISTRATION_SOURCE,
  attendedContactIds,
  contactMatchesRegisteredAnyAndHasPhone,
  eventNameFromMetadata,
  hasUsablePhone,
  isAnyEventRegistrationFilter,
  isEventAttendanceSource,
  isEventRegistrationSource,
  isOutboundOutreach,
  registeredContactIds,
} from "./contact-filter-predicates";

// Guardrail for the Contacts filter-integrity P0. Tess confirmed production
// still listed call-only Other (Austin Sizemore) under Registered-any-event +
// Has phone and offered "Text the N with numbers". No Supabase.
// Run with: npx tsx lib/crm/contact-filter-predicates.proof.ts

const root = join(process.cwd());
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const ASIANNA = "attendee-asianna";
const LEANDRA = "attendee-leandra";
const CALL_ONLY_A = "other-16787832577";
const CALL_ONLY_B = "other-16786892692";
const AUSTIN = "other-austin-sizemore";
const BUYER_WHO_REGISTERED = "buyer-who-also-signed-up";
const WALK_IN = "walkin-checkin-only";
const SPAM_STUB = "spam-inbound-stub";

const registrations = [
  { contactId: ASIANNA, eventName: "House Hacking ATL", source: EVENT_REGISTRATION_SOURCE },
  { contactId: LEANDRA, eventName: "Women's REI Meetup", source: EVENT_REGISTRATION_SOURCE },
  { contactId: BUYER_WHO_REGISTERED, eventName: "House Hacking ATL", source: EVENT_REGISTRATION_SOURCE },
  { contactId: "nameless-signup", eventName: null, source: EVENT_REGISTRATION_SOURCE },
  { contactId: CALL_ONLY_A, eventName: null, source: "quo" },
  { contactId: CALL_ONLY_B, eventName: "House Hacking ATL", source: "quo" },
  { contactId: AUSTIN, eventName: null, source: "quo" },
  { contactId: WALK_IN, eventName: "House Hacking ATL", source: "checkin" },
  { contactId: SPAM_STUB, eventName: null, source: "quo" },
];

assert.equal(REGISTERED_FOR_ANY_EVENT, "__any__");
assert.equal(NOT_FILTERED_BY_REGISTRATION, "__all__");
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
assert.equal(anyIds.has(AUSTIN), false, "Austin Sizemore-style Other caller must not match any-event");
assert.equal(anyIds.has(WALK_IN), false, "walk-in check-in is attendance, not registration");
assert.equal(anyIds.has(SPAM_STUB), false, "spam/inbound stub must not match any-event");

const namedIds = registeredContactIds("House Hacking ATL", registrations);
assert.equal(namedIds.has(ASIANNA), true);
assert.equal(namedIds.has(LEANDRA), false, "other event's registrant must not match a named event");
assert.equal(namedIds.has(AUSTIN), false);
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

// Tess scenario: Other + has phone + inbound call only, no Eventbrite/CRM signup.
const austin = { id: AUSTIN, phone: "+16785551212", contact_type: "other" };
const asianna = { id: ASIANNA, phone: "(678) 879-7105", contact_type: "attendee" };
assert.equal(contactMatchesRegisteredAnyAndHasPhone(austin, registrations), false, "Tess: Austin-style Other caller excluded");
assert.equal(contactMatchesRegisteredAnyAndHasPhone(asianna, registrations), true, "Tess: real registrant with phone included");
assert.equal(
  contactMatchesRegisteredAnyAndHasPhone({ id: AUSTIN, phone: "+16785551212", contact_type: "attendee" }, registrations),
  false,
  "contact_type=attendee without signup activity still excluded",
);

const tessCombo = parseContactFilterParams(new URLSearchParams("phone=1"));
assert.equal(tessCombo.hasPhone, true);
assert.equal(tessCombo.registeredEventName, REGISTERED_FOR_ANY_EVENT, "Tess prod URL ?phone=1 (no regEvent) defaults to any-event");
assert.equal(contactMatchesRegisteredAnyAndHasPhone(austin, registrations) && tessCombo.hasPhone, false);

const parsedAny = parseContactFilterParams(new URLSearchParams(`regEvent=${REGISTERED_FOR_ANY_EVENT}&phone=1`));
assert.equal(parsedAny.registeredEventName, REGISTERED_FOR_ANY_EVENT);
assert.equal(parsedAny.hasPhone, true);

const parsedAll = parseContactFilterParams(new URLSearchParams(`regEvent=${NOT_FILTERED_BY_REGISTRATION}&phone=1`));
assert.equal(parsedAll.registeredEventName, undefined, "explicit Anyone does not gate on registration");
assert.equal(parsedAll.hasPhone, true);

const parsedNamed = parseContactFilterParams(new URLSearchParams("regEvent=House Hacking ATL"));
assert.equal(parsedNamed.registeredEventName, "House Hacking ATL");

assert.equal(parseContactFilterParams(new URLSearchParams("phone=1&group=stage")).registeredEventName, REGISTERED_FOR_ANY_EVENT, "stage grouping is still the Tess browse");
const parsedQueue = parseContactFilterParams(new URLSearchParams("queue=duplicate_risk"));
assert.equal(parsedQueue.registeredEventName, undefined, "queue deep links do not inherit any-event default");

const parsedNoPhone = parseContactFilterParams(new URLSearchParams("phone=0"));
assert.equal(parsedNoPhone.registeredEventName, undefined, "no-phone insight is not the Tess combo");

assert.equal(resolveRegisteredEventName(new URLSearchParams()), REGISTERED_FOR_ANY_EVENT);
assert.equal(registrationSelectValue(new URLSearchParams("phone=1")), REGISTERED_FOR_ANY_EVENT);
assert.equal(registrationSelectValue(new URLSearchParams("queue=no_phone")), NOT_FILTERED_BY_REGISTRATION);

const list = read("lib/data/contacts.ts");
assert.ok(list.includes("registeredContactIds("), "listContacts must use the shared registration predicate");
assert.ok(list.includes("EVENT_REGISTRATION_SOURCE"), "registration query is Eventbrite/CRM signup, not calls");
assert.equal(list.includes('eq("metadata->>event_name", filters.registeredEventName)'), false, "any-event must not require event_name");
assert.ok(list.includes("hasUsablePhone"), "phone filter uses the usable-phone predicate");
assert.ok(list.includes("attendedContactIds("), "attended filter is not last_event_name-only");
assert.ok(list.includes('.eq("spam", false)'), "Contacts list still excludes flagged spam; the fix is the predicate, not a manual mark");
assert.equal(list.includes('contact_type') && list.includes("registeredContactIds"), true);
assert.equal(list.includes("filters.type") && list.includes("registeredContactIds("), true);
assert.equal(list.includes("contact_type === \"attendee\""), false, "registration must not gate on contact_type");

const params = read("lib/crm/contact-filter-params.ts");
assert.ok(params.includes("resolveRegisteredEventName"), "parser uses the shared URL resolver");
assert.ok(params.includes("registeredEventName: resolveRegisteredEventName(sp)"));

const filtersUi = read("components/contacts/ContactFilters.tsx");
assert.ok(filtersUi.includes("registrationSelectValue"), "toolbar select matches the parser");
assert.ok(filtersUi.includes("REGISTERED_FOR_ANY_EVENT"), "any-event option uses the sentinel");
assert.ok(filtersUi.includes("NOT_FILTERED_BY_REGISTRATION"), "Anyone is an explicit opt-out, not empty");
assert.ok(filtersUi.includes("Registered for: any event"), "the labeled option still exists");
assert.equal(filtersUi.includes('<option value="">Registered for: any event</option>'), false, "empty option must not claim any-event");
assert.equal(filtersUi.includes("Anyone (not filtered by registration)"), false);

const sheet = read("components/contacts/ContactFiltersSheet.tsx");
assert.ok(sheet.includes("NOT_FILTERED_BY_REGISTRATION"));
assert.ok(sheet.includes("REGISTERED_FOR_ANY_EVENT"));
assert.equal(sheet.includes('<option value="">Registered for: any event</option>'), false);

const mobile = read("components/contacts/mobile/MyLists.tsx");
assert.ok(mobile.includes("REGISTERED_FOR_ANY_EVENT"), "mobile Any event tile must hit the sentinel");

const blast = read("components/contacts/ContactsList.tsx");
assert.ok(blast.includes("Text the {withPhone.length} with numbers"), "group blast still exists");
assert.ok(blast.includes("hasUsablePhone"), "blast IDs use usable phones from the already-filtered list");
assert.ok(blast.includes("onTextGroup(withPhone.map"), "blast cannot invent IDs outside the filtered group");

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

const todayNew = read("lib/crm/new-lead-text-templates.ts");
assert.ok(todayNew.includes("New lead"), "this PR must not rewrite first-touch SMS templates");

console.log("contact filter predicates: ok");
