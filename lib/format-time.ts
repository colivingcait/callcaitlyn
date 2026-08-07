import { formatInTimeZone } from "date-fns-tz";

// Pages that show times are server-rendered, and the server runs in UTC -
// without an explicit timezone, dates would render in the server's zone
// instead of the agent's. This is a single-user app, so a fixed timezone
// (rather than per-viewer detection, which needs client-side rendering and
// causes SSR/hydration mismatches) is the simplest correct fix.
export const APP_TIMEZONE = "America/New_York";

export function formatLocal(date: string | Date, pattern: string): string {
  return formatInTimeZone(date, APP_TIMEZONE, pattern);
}

// date-fns's isToday() compares calendar days using the runtime's local
// clock (UTC on the server) - this compares calendar-day strings in the
// app's timezone instead, so "today" means today in EST, not UTC.
export function isTodayLocal(date: string | Date): boolean {
  return formatLocal(date, "yyyy-MM-dd") === formatLocal(new Date(), "yyyy-MM-dd");
}
