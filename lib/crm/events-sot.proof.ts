import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { eventCadenceDues } from "./today-v1";
import {
  attachFirstTimerCounts,
  campaignsBlastHref,
  eventRosterTextDraft,
  eventsHubStats,
  firstTimerCountForEvent,
  parseCampaignIdsParam,
  registrantIdsForMessage,
  rosterStatusLabel,
} from "./events-sot";

const now = new Date("2026-09-19T16:00:00.000Z");

const past = {
  series: "house_hacking",
  hasEnded: true,
  people: [
    { contactId: "a1", registered: true, attended: true, attendanceNumber: 1 },
    { contactId: "a2", registered: true, attended: true, attendanceNumber: 2 },
  ],
};
const upcoming = {
  series: "house_hacking",
  hasEnded: false,
  people: [
    { contactId: "a1", registered: true, attended: false, attendanceNumber: 0 },
    { contactId: "n1", registered: true, attended: false, attendanceNumber: 0 },
  ],
};

assert.equal(firstTimerCountForEvent(upcoming, [past]), 1, "hub first-timers are registered who never attended the series");
assert.equal(firstTimerCountForEvent(past, []), 1, "past first-timers are attendanceNumber === 1");
assert.equal(attachFirstTimerCounts([upcoming, past])[0]?.firstTimerCount, 1);

assert.equal(campaignsBlastHref(["c1", "c2", "c1"]), "/sequences?ids=" + encodeURIComponent("c1,c2"));
assert.deepEqual(parseCampaignIdsParam("c1,c2,c1"), ["c1", "c2"]);
assert.deepEqual(parseCampaignIdsParam(""), []);

assert.equal(rosterStatusLabel({ registered: true, attended: false }, false), "Registered");
assert.equal(rosterStatusLabel({ registered: true, attended: false }, true), "No-show");
assert.equal(rosterStatusLabel({ registered: true, attended: true }, true), "Checked in");

assert.deepEqual(
  registrantIdsForMessage([
    { contactId: "a", registered: true, attended: false },
    { contactId: "b", registered: false, attended: true },
    { contactId: "a", registered: true, attended: true },
  ]),
  ["a", "b"],
);

const draft = eventRosterTextDraft("house_hacking", "House hacking workshop", 3);
assert.ok(draft.includes("{{first_name}}"), "Text & Next event template stays merge-field based until send");
assert.equal(draft.includes("npx twilio"), false);

const dues = eventCadenceDues(
  [
    {
      key: "house_hacking:eb1",
      label: "House hacking workshop",
      startsAt: "2026-09-24T22:00:00.000Z",
      date: "2026-09-24T22:00:00.000Z",
      registrantIds: ["r1"],
      pastAttendeeIds: ["a1", "a2"],
      textDaysBefore: 3,
      showOnToday: true,
    },
    {
      key: "hidden",
      label: "Hidden meetup",
      startsAt: "2026-09-22T22:00:00.000Z",
      date: "2026-09-22T22:00:00.000Z",
      registrantIds: ["x1"],
      pastAttendeeIds: ["y1"],
      showOnToday: false,
    },
  ],
  now,
);
assert.ok(dues.some((row) => row.kind === "email_invite" && row.eventName === "House hacking workshop"));
assert.ok(dues.some((row) => row.kind === "text_reminder" && row.eventName === "House hacking workshop"));
assert.equal(
  dues.some((row) => row.eventName === "Hidden meetup"),
  false,
  "cadence toggle off keeps steps off Today",
);

const stats = eventsHubStats(
  [
    { startsAt: "2026-09-24T22:00:00.000Z", date: "2026-09-24T22:00:00.000Z", hasEnded: false, counts: { registered: 18, attended: 0 } },
    { startsAt: "2026-09-01T22:00:00.000Z", date: "2026-09-01T22:00:00.000Z", hasEnded: true, counts: { registered: 20, attended: 16 } },
  ],
  now,
);
assert.equal(stats.registeredThisMonth, 38);
assert.equal(stats.avgShowUp, 80);

const root = join(process.cwd());
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const hub = read("components/events/EventsHub.tsx");
assert.ok(hub.includes("Upcoming"));
assert.ok(hub.includes("Past"));
assert.ok(hub.includes("firstTimerCount") || hub.includes("first-timers"));
assert.ok(hub.includes("first-timers"), "hub cards show first-timers count");
assert.ok(hub.includes("Users"));
assert.ok(hub.includes("View roster"));
assert.ok(hub.includes("Message registrants"));
assert.ok(hub.includes("MessageRegistrantsModal"));
assert.equal(hub.includes("<Phone"), false, "View roster must not use a phone icon");
assert.equal(hub.includes("max-w-3xl"), false, "Events hub is not a phone column");
assert.ok(hub.includes("max-w-[1400px]"), "desktop Events hub is wide");

const roster = read("components/events/RosterView.tsx");
assert.ok(roster.includes("Mark attended"));
assert.ok(roster.includes("Mark no-show"));
assert.ok(roster.includes("AddRegistrantButton"));
assert.ok(roster.includes("MessageRegistrantsModal"));
assert.ok(roster.includes("Last touch") || roster.includes("lastActivityLabels"));
assert.ok(roster.includes("event.hasEnded"), "roster no-show UI is gated on hasEnded");

const modal = read("components/events/MessageRegistrantsModal.tsx");
assert.ok(modal.includes("Text &amp; Next") || modal.includes("Text & Next"));
assert.ok(modal.includes("Message all") || modal.includes("Open in Campaigns"));
assert.ok(modal.includes("campaignsBlastHref"));
assert.ok(modal.includes("textNext=1"));
assert.equal(modal.includes("createContactsTextBlast"), false, "choice modal does not rebuild the Campaigns composer");
assert.equal(modal.includes("createTextBlast"), false);

const cadence = read("components/events/EventCadencePanel.tsx");
assert.ok(cadence.includes("Email invite"));
assert.ok(cadence.includes("Text reminder"));
assert.ok(cadence.includes("EMAIL_INVITE_DAYS_BEFORE"));
assert.ok(cadence.includes("Show due steps on Today"));
assert.ok(cadence.includes("Past attendees") || cadence.includes("ever attended"));

const campaigns = read("app/(app)/sequences/page.tsx");
assert.ok(campaigns.includes("ids"));
assert.ok(campaigns.includes("autoOpenIds"));

const newText = read("components/sequences/NewTextButton.tsx");
assert.ok(newText.includes("autoOpenIds"));
assert.ok(newText.includes('kind: "contacts"'));
assert.ok(newText.includes("TextBlastModal"), "Message all reuses the existing Campaigns texter");

const todayTodos = read("components/dashboard/TodayTodosCard.tsx");
assert.ok(todayTodos.includes("cadenceDues"));
assert.ok(todayTodos.includes("MessageRegistrantsModal"));
assert.ok(todayTodos.includes("todo-text"));
assert.ok(todayTodos.includes("todo-email"));

const eventsPage = read("app/(app)/events/page.tsx");
assert.ok(eventsPage.includes("e.hasEnded"), "Past events section is hasEnded-gated");
assert.ok(eventsPage.includes("EventsHub"));
assert.ok(eventsPage.includes("CombineDuplicateButton"), "do not rip out live Events tooling");

const detail = read("app/(app)/events/[key]/page.tsx");
assert.ok(detail.includes("CheckInLive"), "keep live door check-in");
assert.ok(detail.includes("EventCadencePanel"));
assert.ok(detail.includes("RosterView"));

const todayV1 = read("lib/crm/today-v1.ts");
assert.ok(todayV1.includes("EMAIL_INVITE_DAYS_BEFORE = 10"));
assert.ok(todayV1.includes("TEXT_REMINDER_DAYS_BEFORE = 3"));
assert.ok(todayV1.includes("showOnToday"));

assert.ok(read("components/events/PrepCard.tsx").includes("First-timers"), "existing PrepCard stays in the repo");
assert.ok(read("components/events/CheckInLive.tsx").includes("checkIn"));
assert.ok(read("app/(app)/events/actions.ts").includes("markContactAttended"));
assert.ok(read("app/(app)/events/actions.ts").includes("saveEventCadence"));

console.log("events sot polish: ok");
