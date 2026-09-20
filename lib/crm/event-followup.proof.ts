import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  defaultFollowUpAudience,
  defaultFollowUpTitle,
  encodeFollowUpDescription,
  followUpAudienceLabel,
  followUpDueDateInput,
  followUpDueTomorrowIso,
  parseFollowUpAudienceParam,
  parseFollowUpMeta,
  peopleForFollowUpAudience,
  shouldOfferFollowUp,
  stripFollowUpMarker,
  taskIsOpenFollowUpForEvent,
} from "./event-followup";

const now = new Date("2026-09-19T16:00:00.000Z");

assert.equal(defaultFollowUpTitle("Women's Meetup"), "Follow up — Women's Meetup attendees");
assert.equal(followUpDueDateInput(now), "2026-09-20");
assert.equal(followUpDueTomorrowIso(now).includes("2026-09-20"), true);
assert.equal(followUpAudienceLabel("checked_in", 18), "Checked in only (18)");
assert.equal(defaultFollowUpAudience("all", true), "checked_in");
assert.equal(defaultFollowUpAudience("no_show", true), "no_show");
assert.equal(parseFollowUpAudienceParam("checked_in"), "checked_in");
assert.equal(parseFollowUpAudienceParam("smart"), null);

const people = [
  { contactId: "a", registered: true, attended: true, isFirstTimer: true },
  { contactId: "b", registered: true, attended: false, isFirstTimer: false },
  { contactId: "c", registered: false, attended: true, isFirstTimer: false },
];
assert.deepEqual(
  peopleForFollowUpAudience(people, "checked_in", true).map((row) => row.contactId),
  ["a", "c"],
);
assert.deepEqual(
  peopleForFollowUpAudience(people, "no_show", true).map((row) => row.contactId),
  ["b"],
);
assert.equal(peopleForFollowUpAudience(people, "no_show", false).length, 0, "no-shows stay out until the event ends");
assert.deepEqual(
  peopleForFollowUpAudience(people, "first_timers", true).map((row) => row.contactId),
  ["a"],
);

const notes = "Text the checked-in group tomorrow.";
const encoded = encodeFollowUpDescription(notes, {
  v: 1,
  kind: "event_followup",
  eventKey: "womens_rei:eb1",
  eventLabel: "Women's Meetup",
  audience: "checked_in",
  contactIds: ["a", "c"],
  showOnToday: true,
  actionText: true,
  actionDoNext: true,
});
const meta = parseFollowUpMeta(encoded);
assert.ok(meta);
assert.equal(meta?.eventKey, "womens_rei:eb1");
assert.equal(meta?.audience, "checked_in");
assert.deepEqual(meta?.contactIds, ["a", "c"]);
assert.equal(stripFollowUpMarker(encoded), notes);
assert.equal(taskIsOpenFollowUpForEvent({ description: encoded, completed_at: null }, "womens_rei:eb1"), true);
assert.equal(taskIsOpenFollowUpForEvent({ description: encoded, completed_at: now.toISOString() }, "womens_rei:eb1"), false);
assert.equal(parseFollowUpMeta("plain notes"), null);

assert.equal(shouldOfferFollowUp({ hasEnded: true, checkedInCount: 18, hasOpenFollowUp: false, dismissed: false }), true);
assert.equal(shouldOfferFollowUp({ hasEnded: true, checkedInCount: 0, hasOpenFollowUp: false, dismissed: false }), false);
assert.equal(shouldOfferFollowUp({ hasEnded: true, checkedInCount: 18, hasOpenFollowUp: true, dismissed: false }), false);
assert.equal(shouldOfferFollowUp({ hasEnded: false, checkedInCount: 4, hasOpenFollowUp: false, dismissed: false }), false);

const root = join(process.cwd());
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const roster = read("components/events/RosterView.tsx");
assert.ok(roster.includes("FollowUpTaskDrawer"));
assert.ok(roster.includes("checked_in"));
assert.ok(roster.includes("Create follow-up task"));
assert.equal(roster.includes("BulkAddToListModal"), false);

const drawer = read("components/events/FollowUpTaskDrawer.tsx");
assert.ok(drawer.includes("createEventFollowUpTask"));
assert.ok(drawer.includes("Checked in only") || drawer.includes("followUpAudienceLabel"));
assert.ok(drawer.includes("Tomorrow") || drawer.includes("followUpDueChipLabel"));
assert.ok(drawer.includes("Today"));
assert.ok(drawer.includes("Do Next"));
assert.ok(drawer.includes("Text"));
assert.ok(drawer.includes("Save task"));
assert.equal(drawer.includes("Smart list"), false);

const action = read("app/(app)/events/actions.ts");
assert.ok(action.includes("createEventFollowUpTask"));
assert.ok(action.includes("encodeFollowUpDescription"));
assert.ok(action.includes('priority: "high"'));

const page = read("app/(app)/events/[key]/page.tsx");
assert.ok(page.includes("startFollowUp"));
assert.ok(page.includes("textNextAudience"));
assert.ok(page.includes("getOpenEventFollowUp"));

const today = read("lib/data/today.ts");
assert.ok(today.includes("parseFollowUpMeta"));
assert.ok(today.includes("followUpTextHref"));
assert.ok(today.includes("textNext=1"));

const todos = read("components/dashboard/TodayTodosCard.tsx");
assert.ok(todos.includes("todo-followup-text"));
assert.ok(todos.includes("Text &amp; Next") || todos.includes("Text & Next"));
assert.ok(todos.includes("followUpTextHref"));

console.log("event post-event follow-up: ok");
