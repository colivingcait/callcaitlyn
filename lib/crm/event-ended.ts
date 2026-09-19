import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { APP_TIMEZONE } from "@/lib/format-time";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const NAIVE_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

// Wall-clock strings (date-only or datetime-local) are America/New_York,
// not the runtime's zone. ISO instants with Z/offset stay absolute.
export function parseEventInstant(value: string): Date {
  const trimmed = value.trim();
  if (DATE_ONLY.test(trimmed)) {
    return fromZonedTime(`${trimmed}T00:00:00`, APP_TIMEZONE);
  }
  if (NAIVE_DATETIME.test(trimmed)) {
    const withSeconds = trimmed.length === 16 ? `${trimmed}:00` : trimmed;
    return fromZonedTime(withSeconds, APP_TIMEZONE);
  }
  return new Date(trimmed);
}

export function endOfLocalDayFromEventTime(value: string): Date {
  const instant = parseEventInstant(value);
  const day = formatInTimeZone(instant, APP_TIMEZONE, "yyyy-MM-dd");
  return fromZonedTime(`${day}T23:59:59.999`, APP_TIMEZONE);
}

export type EventSchedule = {
  endsAt?: string | null;
  startsAt?: string | null;
};

// End instant used for Past / no-show gating:
// 1. real endsAt
// 2. otherwise end of the start's America/New_York calendar day
// Missing both means we cannot prove the event is over.
export function eventEndInstant(schedule: EventSchedule): Date | null {
  if (schedule.endsAt) return parseEventInstant(schedule.endsAt);
  if (schedule.startsAt) return endOfLocalDayFromEventTime(schedule.startsAt);
  return null;
}

export function eventHasEnded(schedule: EventSchedule, now: Date = new Date()): boolean {
  const end = eventEndInstant(schedule);
  if (!end) return false;
  return end.getTime() <= now.getTime();
}

// Registered-but-not-checked-in is only a no-show after the event has
// actually ended. Upcoming / in-progress events stay at 0.
export function eventNoShowCount(hasEnded: boolean, registeredIds: Iterable<string>, attendedIds: ReadonlySet<string>): number {
  if (!hasEnded) return 0;
  let n = 0;
  for (const id of registeredIds) {
    if (!attendedIds.has(id)) n += 1;
  }
  return n;
}

export function eventWalkInCount(registeredIds: ReadonlySet<string>, attendedIds: Iterable<string>): number {
  let n = 0;
  for (const id of attendedIds) {
    if (!registeredIds.has(id)) n += 1;
  }
  return n;
}
