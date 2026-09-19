import { applyMergeFields } from "@/lib/crm/merge-fields";
import {
  firstTouchSourceChipLabel,
  firstTouchTemplate,
  type FirstTouchSignals,
} from "@/lib/crm/new-lead-text-templates";
import { APP_TIMEZONE, formatLocal } from "@/lib/format-time";
import { displayFullName } from "@/lib/utils";
import { fromZonedTime } from "date-fns-tz";
import type { NewLeadContact } from "@/lib/data/new-leads";
import type { WorklistTask } from "@/lib/data/today";

export type TextAndNextLead = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  phone: string | null;
  leadDate: string | null;
  sourceChip: string;
  draft: string;
  autoFillNote: string;
};

export function calendarDaysFromToday(iso: string, now = new Date()): number {
  const targetDay = formatLocal(iso, "yyyy-MM-dd");
  const todayDay = formatLocal(now, "yyyy-MM-dd");
  const target = fromZonedTime(`${targetDay}T12:00:00`, APP_TIMEZONE).getTime();
  const today = fromZonedTime(`${todayDay}T12:00:00`, APP_TIMEZONE).getTime();
  return Math.round((target - today) / 86_400_000);
}

export function daysOutLabel(iso: string, now = new Date()): string {
  const days = calendarDaysFromToday(iso, now);
  if (days <= 0) return "today";
  if (days === 1) return "in 1 day";
  return `in ${days} days`;
}

export function taskDueLabel(dueAt: string | null, now = new Date()): string | null {
  if (!dueAt) return null;
  const days = calendarDaysFromToday(dueAt, now);
  if (days <= 0) return "Today";
  if (days === 1) return "in 1 day";
  return `in ${days} days`;
}

export function leadAgeLabel(leadDate: string | null, now = new Date()): string {
  if (!leadDate) return "new";
  const minutes = Math.floor((now.getTime() - new Date(leadDate).getTime()) / 60_000);
  if (minutes < 1) return "new · just now";
  if (minutes < 60) return `new · ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `new · ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `new · ${days}d ago`;
}

export function buildTextAndNextLeads(contacts: NewLeadContact[]): TextAndNextLead[] {
  return contacts.map((c) => {
    const signals: FirstTouchSignals = {
      leadSource: c.lead_source,
      lastEventName: c.last_event_name,
      tagNames: c.tagNames,
    };
    const sourceChip = firstTouchSourceChipLabel(signals);
    return {
      id: c.id,
      firstName: c.first_name,
      lastName: c.last_name,
      name: displayFullName(c),
      phone: c.phone,
      leadDate: c.lead_date,
      sourceChip,
      draft: applyMergeFields(firstTouchTemplate(signals), {
        first_name: c.first_name,
        last_name: c.last_name,
      }),
      autoFillNote: `First message auto-filled from ${sourceChip}.`,
    };
  });
}

export function upcomingEventRows<T>(items: T[], cap = 2): T[] {
  return items.slice(0, cap);
}

export function openTasksForToday(tasks: WorklistTask[], cap = 8): WorklistTask[] {
  return tasks.slice(0, cap);
}

export function addCalendarDaysIso(iso: string, days: number): string {
  const day = formatLocal(iso, "yyyy-MM-dd");
  const noon = fromZonedTime(`${day}T12:00:00`, APP_TIMEZONE);
  return new Date(noon.getTime() + days * 86_400_000).toISOString();
}

// Event cadence that surfaces on Today → To Dos. Offsets match the
// pre-event templates in event-text-templates.ts: invite past attendees
// two weeks out, text current registrants a couple of days before.
export const EMAIL_INVITE_DAYS_BEFORE = 14;
export const TEXT_REMINDER_DAYS_BEFORE = 2;
export const CADENCE_LOOKAHEAD_DAYS = 7;

export type EventCadenceInput = {
  key: string;
  label: string;
  startsAt: string | null;
  date: string;
  registrantIds: string[];
  pastAttendeeIds: string[];
};

export type EventCadenceDue = {
  id: string;
  kind: "email_invite" | "text_reminder";
  title: string;
  eventName: string;
  eventKey: string;
  audienceCount: number;
  audienceLabel: string;
  dueAt: string;
  action: "email" | "text";
  contactIds: string[];
};

function eventStartIso(event: Pick<EventCadenceInput, "startsAt" | "date">): string {
  return event.startsAt ?? event.date;
}

function cadenceDueRow(
  event: EventCadenceInput,
  kind: EventCadenceDue["kind"],
  daysBefore: number,
  contactIds: string[],
  audienceNoun: string,
  now: Date,
): EventCadenceDue | null {
  if (contactIds.length === 0) return null;
  const startIso = eventStartIso(event);
  if (!startIso) return null;
  const daysUntilEvent = calendarDaysFromToday(startIso, now);
  if (daysUntilEvent < 0) return null;
  const daysUntilDue = daysUntilEvent - daysBefore;
  if (daysUntilDue > CADENCE_LOOKAHEAD_DAYS) return null;
  const noun = contactIds.length === 1 ? audienceNoun : `${audienceNoun}s`;
  return {
    id: `cadence-${kind}-${event.key}`,
    kind,
    title: kind === "email_invite" ? "Email invite" : "Text reminder",
    eventName: event.label,
    eventKey: event.key,
    audienceCount: contactIds.length,
    audienceLabel: `${contactIds.length} ${noun}`,
    dueAt: addCalendarDaysIso(startIso, -daysBefore),
    action: kind === "email_invite" ? "email" : "text",
    contactIds,
  };
}

export function eventCadenceDues(events: EventCadenceInput[], now = new Date()): EventCadenceDue[] {
  const rows: EventCadenceDue[] = [];
  for (const event of events) {
    const registered = new Set(event.registrantIds);
    const pastNotRegistered = event.pastAttendeeIds.filter((id) => !registered.has(id));
    const email = cadenceDueRow(event, "email_invite", EMAIL_INVITE_DAYS_BEFORE, pastNotRegistered, "past attendee", now);
    const text = cadenceDueRow(event, "text_reminder", TEXT_REMINDER_DAYS_BEFORE, event.registrantIds, "registrant", now);
    if (email) rows.push(email);
    if (text) rows.push(text);
  }
  return rows.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
}

export function cadenceDueLabel(dueAt: string, now = new Date()): string {
  const label = taskDueLabel(dueAt, now);
  if (!label) return "";
  return label === "Today" ? "Due today" : `Due ${label}`;
}
