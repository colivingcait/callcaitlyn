import assert from "node:assert/strict";
import { fromZonedTime } from "date-fns-tz";
import { APP_TIMEZONE } from "@/lib/format-time";
import { eventHasEnded, eventNoShowCount, eventEndInstant, parseEventInstant } from "./event-ended";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function et(isoWall: string): Date {
  return fromZonedTime(isoWall, APP_TIMEZONE);
}

const registered = ["a", "b", "c"];
const attended = new Set(["a"]);

// Future Sep 22 meetup (the Tess repro): not Past, no no-shows, even when
// people have already registered.
const sep22Start = "2026-09-22T18:30:00";
const sep22End = "2026-09-22T20:30:00";
const sep18Evening = et("2026-09-18T17:00:00");

assert.equal(eventHasEnded({ startsAt: sep22Start, endsAt: sep22End }, sep18Evening), false);
assert.equal(eventNoShowCount(false, registered, attended), 0);
assert.equal(eventHasEnded({ startsAt: sep22Start }, sep18Evening), false, "start-only future day is not over");

// Date-only Sep 22 is the whole ET day, not UTC midnight (which is still
// Sep 21 evening in New York).
const sep22MorningEt = et("2026-09-22T10:00:00");
const sep23MorningEt = et("2026-09-23T00:01:00");
assert.equal(eventHasEnded({ startsAt: "2026-09-22" }, sep22MorningEt), false);
assert.equal(eventHasEnded({ startsAt: "2026-09-22" }, sep23MorningEt), true);

// After the real end, Past + no-shows are allowed.
const afterEnd = et("2026-09-22T20:31:00");
assert.equal(eventHasEnded({ startsAt: sep22Start, endsAt: sep22End }, afterEnd), true);
assert.equal(eventNoShowCount(true, registered, attended), 2);

// Naive datetime-local is ET, not UTC. 8:30pm ET = 00:30 UTC next day —
// comparing as UTC would mark it ended too early on the East Coast.
const endInstant = eventEndInstant({ endsAt: sep22End });
assert.ok(endInstant);
assert.equal(endInstant.toISOString(), et("2026-09-22T20:30:00").toISOString());
assert.equal(parseEventInstant("2026-09-22T18:30").toISOString(), et("2026-09-22T18:30:00").toISOString());

// No schedule at all cannot prove "over" — that's how registration-only
// future Eventbrite buckets used to land under Past.
assert.equal(eventHasEnded({}, sep18Evening), false);
assert.equal(eventNoShowCount(eventHasEnded({}, sep18Evening), registered, attended), 0);

const root = join(process.cwd());
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const eventsData = read("lib/data/events.ts");
assert.ok(eventsData.includes("eventHasEnded"), "roster uses timezone-aware eventHasEnded");
assert.ok(eventsData.includes("eventNoShowCount"), "no-show counts go through eventNoShowCount");
assert.equal(eventsData.includes("hasEnded: bucket.endsAt ? new Date(bucket.endsAt).getTime() <= Date.now() : true"), false);
assert.equal(eventsData.includes("hasEnded: new Date(e.ends_at).getTime() <= Date.now()"), false);

const eventsPage = read("app/(app)/events/page.tsx");
assert.ok(eventsPage.includes("e.hasEnded"), "Past events section is hasEnded-gated");

const roster = read("components/events/RosterView.tsx");
assert.ok(roster.includes("event.hasEnded"), "roster no-show UI is gated on hasEnded");

const createEvent = read("app/(app)/events/actions.ts");
assert.ok(createEvent.includes("fromZonedTime") && createEvent.includes("APP_TIMEZONE"), "New event times persist as America/New_York");

console.log("event past / no-show gating: ok");
