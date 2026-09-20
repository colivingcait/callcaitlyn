import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ABANDONMENT_DELAY_MS,
  abandonedBookingNotifyCopy,
  isAbandonedBookingStage,
  isAbandonedFollowUpDue,
  shouldNotifyAbandonedBooking,
} from "./booking-abandonment";

assert.equal(ABANDONMENT_DELAY_MS, 10 * 60 * 1000);
assert.equal(isAbandonedBookingStage("info"), true);
assert.equal(isAbandonedBookingStage("time_selected"), true);
assert.equal(isAbandonedBookingStage("pending"), false);
assert.equal(isAbandonedBookingStage("approved"), false);
assert.equal(isAbandonedBookingStage("canceled"), false);

const now = new Date("2026-09-20T18:00:00.000Z");
assert.equal(isAbandonedFollowUpDue(new Date(now.getTime() - 9 * 60 * 1000).toISOString(), now), false);
assert.equal(isAbandonedFollowUpDue(new Date(now.getTime() - 10 * 60 * 1000).toISOString(), now), true);

const due = {
  stage: "info",
  created_at: new Date(now.getTime() - 12 * 60 * 1000).toISOString(),
  abandonment_notified_at: null,
};
assert.equal(shouldNotifyAbandonedBooking(due, now), true);
assert.equal(shouldNotifyAbandonedBooking({ ...due, abandonment_notified_at: now.toISOString() }, now), false);
assert.equal(shouldNotifyAbandonedBooking({ ...due, stage: "pending" }, now), false);
assert.equal(
  shouldNotifyAbandonedBooking({ ...due, created_at: new Date(now.getTime() - 5 * 60 * 1000).toISOString() }, now),
  false,
);

assert.equal(abandonedBookingNotifyCopy({ visitor_name: "Alex Rivera" }).title, "Alex Rivera");
assert.match(abandonedBookingNotifyCopy({ visitor_name: "Alex Rivera" }).body, /didn't finish/);

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const bookingActions = read("app/book/booking-actions.ts");
assert.ok(bookingActions.includes('stage: "info"'));
assert.ok(bookingActions.includes("startBookingSession"));
assert.equal(bookingActions.includes("calendly"), false, "CRM Booking screen is /book, not Calendly");

const today = read("lib/data/today.ts");
assert.ok(today.includes("listAbandonedBookingFollowUps"));
assert.ok(today.includes("abandonedBookings"));

const home = read("components/dashboard/TodayHome.tsx");
assert.ok(home.includes("TodayAbandonedBookingCard"));
assert.ok(home.includes("abandonedBookings"));

const card = read("components/dashboard/TodayAbandonedBookingCard.tsx");
assert.ok(card.includes("started a booking"));
assert.ok(card.includes("cancelAbandonedSession"));
assert.ok(card.includes("Follow up"));
assert.equal(card.includes("Approve"), false);

const cron = read("app/api/cron/booking-reminders/route.ts");
assert.ok(cron.includes("sendAbandonedBookingFollowUps"));

const vercel = read("vercel.json");
assert.ok(vercel.includes('"/api/cron/booking-reminders"'));
assert.match(vercel, /booking-reminders", "schedule": "\*\/5/);

const migration = read("supabase/migrations/0080_booking_abandonment.sql");
assert.ok(migration.includes("abandonment_notified_at"));

console.log("booking abandonment: ok");
