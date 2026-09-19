import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildTextAndNextLeads, daysOutLabel, leadAgeLabel, taskDueLabel } from "./today-v1";

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

const root = join(process.cwd());
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const todayHome = read("components/dashboard/TodayHome.tsx");
assert.ok(todayHome.includes("Here&apos;s who needs you today."));
assert.ok(todayHome.includes("TextAndNextDialer"));
assert.ok(todayHome.includes("TodayTodosCard"));
assert.ok(todayHome.includes("upcomingCrmEvents"));
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
assert.ok(todayData.includes('eq("source", "eventbrite")'));
assert.equal(todayData.includes("googleapis"), false);
assert.equal(todayData.includes("listGoogle"), false);

const todos = read("components/dashboard/TodayTodosCard.tsx");
assert.ok(todos.includes("completed_at"));
assert.ok(todos.includes("taskDueLabel"));

const pipeline = read("components/dashboard/TodayPipelineOverview.tsx");
assert.ok(pipeline.includes("Pipeline Overview"));
assert.ok(pipeline.includes("conic-gradient"));
assert.ok(pipeline.includes("Total"));

const nav = read("components/nav/nav-items.ts");
assert.ok(nav.includes('label: "Today"'));
assert.ok(nav.includes('label: "Contacts"'));
assert.ok(nav.includes('label: "Messages"'));
assert.ok(nav.includes('label: "Pipeline"'));
assert.ok(nav.includes('label: "More"'));
assert.equal(nav.includes('href: "/pulse"'), false);

const bottomNav = read("components/nav/BottomNav.tsx");
assert.ok(bottomNav.includes("MOBILE_NAV_ITEMS"));
assert.ok(bottomNav.includes("lg:hidden"));

const screen = read("components/dashboard/TodayScreen.tsx");
assert.ok(screen.includes("lg:hidden"), "phone Today still mounts");
assert.ok(screen.includes("TodayDesktop"));
assert.equal(screen.includes("renderItem"), false);

console.log("today v1 layout + dialer: ok");
