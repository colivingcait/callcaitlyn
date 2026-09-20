import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { bookingCardName, bookingWindowLabel, buildTextAndNextLeads, cadenceDueLabel, daysOutLabel, eventCadenceDues, leadAgeLabel, taskDueLabel } from "./today-v1";

// Today v1 (Nico mock): Text & Next + stacked mobile / 2-col desktop.
// No Supabase. Run with: npx tsx lib/crm/today-v1.proof.ts

const now = new Date("2026-09-19T16:00:00.000Z");

assert.equal(daysOutLabel("2026-09-19T16:00:00.000Z", now), "today");
assert.equal(daysOutLabel("2026-09-20T16:00:00.000Z", now), "in 1 day");
assert.equal(daysOutLabel("2026-09-24T16:00:00.000Z", now), "in 5 days");
assert.equal(taskDueLabel("2026-09-19T16:00:00.000Z", now), "Today");
assert.equal(taskDueLabel("2026-09-21T16:00:00.000Z", now), "in 2 days");
assert.equal(taskDueLabel(null, now), null);
assert.equal(leadAgeLabel(new Date(now.getTime() - 12 * 60_000).toISOString(), now), "new · 12m ago");
assert.equal(leadAgeLabel(new Date(now.getTime() - 30_000).toISOString(), now), "new · just now");

const zillowLead = buildTextAndNextLeads([
  {
    id: "c1",
    first_name: "Asianna",
    last_name: "Ware",
    phone: "(404) 555-0187",
    lead_source: "Zillow",
    lead_date: new Date(now.getTime() - 12 * 60_000).toISOString(),
    stage_id: null,
    last_event_name: null,
    tagNames: [],
  },
]);
assert.equal(zillowLead[0]?.sourceChip, "Zillow");
assert.ok(zillowLead[0]?.draft.includes("Zillow"));
assert.equal(zillowLead[0]?.autoFillNote, "First message auto-filled from Zillow.");
assert.equal(zillowLead[0]?.draft.includes("{{first_name}}"), false);

const houseHack = {
  key: "house_hacking:eb1",
  label: "House hacking workshop",
  startsAt: "2026-09-24T22:00:00.000Z",
  date: "2026-09-24T22:00:00.000Z",
  registrantIds: ["r1"],
  pastAttendeeIds: ["a1", "a2"],
};
const womens = {
  key: "womens_rei:eb2",
  label: "Women's investor meetup",
  startsAt: "2026-10-01T22:00:00.000Z",
  date: "2026-10-01T22:00:00.000Z",
  registrantIds: ["w1", "w2"],
  pastAttendeeIds: [],
};
const dues = eventCadenceDues([houseHack, womens], now);
assert.ok(dues.some((row) => row.kind === "email_invite" && row.eventName === houseHack.label && row.audienceCount === 2));
assert.ok(dues.some((row) => row.kind === "text_reminder" && row.eventName === houseHack.label && row.audienceCount === 1));
assert.equal(
  dues.some((row) => row.kind === "email_invite" && row.eventName === womens.label),
  false,
  "no Email invite without past attendees",
);
assert.equal(
  dues.some((row) => row.kind === "text_reminder" && row.eventName === womens.label),
  false,
  "text reminder for an event 12 days out stays off until the T-3 + 7-day lookahead window",
);
assert.equal(cadenceDueLabel("2026-09-19T16:00:00.000Z", now), "Due today");
assert.equal(cadenceDueLabel("2026-09-21T16:00:00.000Z", now), "Due in 2 days");
assert.equal(eventCadenceDues([], now).length, 0);
assert.equal(bookingWindowLabel("2026-09-22T18:00:00.000Z", "2026-09-22T18:30:00.000Z"), "Tue 2:00–2:30 PM");
assert.equal(bookingWindowLabel(null, null), "Time TBD");
assert.equal(bookingCardName("Jordan Blake", "Visitor"), "Jordan Blake");
assert.equal(bookingCardName(null, "Jordan Blake"), "Jordan Blake");

const root = join(process.cwd());
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const todayHome = read("components/dashboard/TodayHome.tsx");
assert.ok(todayHome.includes("Here&apos;s who needs you today."));
assert.ok(todayHome.includes("TextAndNextDialer"));
assert.ok(todayHome.includes("TodayBookingRequestCard"));
assert.ok(todayHome.includes("TodayAbandonedBookingCard"));
assert.ok(todayHome.includes("abandonedBookings"));
assert.ok(todayHome.includes("needs-you") || todayHome.includes("Needs you"));
assert.ok(todayHome.includes("TodayTodosCard"));
assert.ok(todayHome.includes("upcomingCrmEvents"));
assert.ok(todayHome.includes("cadenceDues"), "To Dos receive event cadence dues");
assert.ok(todayHome.includes("md:col-span-6"), "Pipeline | Events from tablet/desktop, not only xl");
assert.equal(todayHome.includes("xl:col-span-6"), false, "1280 must not be a different layout");
assert.equal(todayHome.includes("if (wide)"), false, "one layout path");
assert.equal(todayHome.includes("TodayQueues"), false);
assert.equal(todayHome.includes("Do next"), false);
assert.equal(todayHome.includes("onAdvance="), false, "no RSC function props into the dialer");
assert.equal(todayHome.includes("google"), false);
assert.equal(todayHome.includes("renderItem"), false);

const dialer = read("components/dashboard/TextAndNextDialer.tsx");
assert.ok(dialer.includes('"use client"'));
assert.ok(dialer.includes("sendTextToContact"));
assert.ok(dialer.includes('data-today-control="send-and-next"'));
assert.ok(dialer.includes('data-today-control="skip-lead"'));
assert.ok(dialer.includes("/settings#text-templates"));
assert.equal(dialer.includes("onAdvance="), false);

const events = read("components/dashboard/TodayUpcomingEvents.tsx");
assert.ok(events.includes("registeredCount"));
assert.ok(events.includes("daysOutLabel"));
assert.ok(events.includes("if (items.length === 0) return null"), "hide Events when none upcoming");
assert.equal(events.includes("Nothing on the calendar"), false, "no empty Events card");

const todayData = read("lib/data/today.ts");
assert.ok(todayData.includes("upcomingCrmEvents"));
assert.ok(todayData.includes("registeredCount"));
assert.ok(todayData.includes("getEventsData"), "Today events use the same /events source");
assert.ok(todayData.includes("upcomingEventsFromData"));
assert.ok(todayData.includes("eventCadenceDues"));
const eventsData = read("lib/data/events.ts");
assert.ok(eventsData.includes("upcomingEventsFromData"));
assert.ok(eventsData.includes("data.nextUp"), "Today upcoming set cannot drop /events nextUp");
assert.equal(todayData.includes('.gte("starts_at"'), false, "do not use the too-narrow starts_at >= now filter");
assert.equal(todayData.includes("googleapis"), false);
assert.equal(todayData.includes("listGoogle"), false);

const todos = read("components/dashboard/TodayTodosCard.tsx");
assert.ok(todos.includes("completed_at"));
assert.ok(todos.includes("taskDueLabel"));
assert.ok(todos.includes("cadenceDues"));
assert.ok(todos.includes("Email invite") || todos.includes("row.title"));
assert.ok(todos.includes("todo-email"));
assert.ok(todos.includes("todo-text"));
assert.ok(todos.includes("MessageRegistrantsModal"), "Today Text CTA opens the Events choice modal");
assert.ok(todos.includes("todo-followup-text"), "event follow-up tasks surface on Today as Text & Next");
assert.equal(todos.includes("TextBlastModal"), false, "Today Text does not skip the choice modal");
assert.equal(todos.includes("Nothing on the calendar"), false);

const pipeline = read("components/dashboard/TodayPipelineOverview.tsx");
assert.ok(pipeline.includes("Pipeline Overview"));
assert.ok(pipeline.includes("conic-gradient"));
assert.ok(pipeline.includes("Total"));

const nav = read("components/nav/nav-items.ts");
assert.ok(nav.includes('label: "Today"'));
assert.ok(nav.includes('label: "Contacts"'));
assert.ok(nav.includes('label: "Messages"'));
assert.ok(nav.includes('label: "Pipeline"'));
assert.ok(nav.includes('label: "Events"'));
assert.ok(nav.includes('label: "More"'));
assert.ok(nav.includes('label: "Bookings"'));
assert.equal(nav.includes("Also today"), false);
assert.equal(nav.includes("Money & tools"), false);
assert.equal(nav.includes('href: "/pulse"'), false);

const bottomNav = read("components/nav/BottomNav.tsx");
assert.ok(bottomNav.includes("MOBILE_NAV_ITEMS"));
assert.ok(bottomNav.includes("lg:hidden"));

const screen = read("components/dashboard/TodayScreen.tsx");
assert.ok(screen.includes("lg:hidden"), "phone Today still mounts");
assert.ok(screen.includes("TodayDesktop"));
assert.ok(screen.includes("overflow-x-hidden"), "Today clips horizontal overflow at 1024");
assert.equal(screen.includes("TodayQueues"), false);
assert.equal(screen.includes("renderItem"), false);

const search = read("components/dashboard/mobile/TodaySearch.tsx");
assert.ok(search.includes("xl:block"), "full search bar waits until 1280 so 1024 greeting stays one line");
assert.ok(search.includes("xl:hidden"), "icon search covers lg/1024 desktop");

console.log("today v1 layout + dialer: ok");
