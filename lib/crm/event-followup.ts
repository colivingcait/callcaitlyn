import { addCalendarDaysIso } from "@/lib/crm/today-v1";
import {
  followUpAudienceFromFilter,
  peopleMatchingRosterFilter,
  type RosterFilterPerson,
  type RosterStatusFilter,
} from "@/lib/crm/events-sot";
import { formatLocal } from "@/lib/format-time";

export const EVENT_FOLLOWUP_MARKER = "cc-event-followup";
export const FOLLOWUP_NOTES_MAX = 300;

export type EventFollowUpAudience = RosterStatusFilter;

export type EventFollowUpMeta = {
  v: 1;
  kind: "event_followup";
  eventKey: string;
  eventLabel: string;
  audience: EventFollowUpAudience;
  contactIds: string[];
  showOnToday: boolean;
  actionText: boolean;
  actionDoNext: boolean;
};

export function defaultFollowUpTitle(eventLabel: string): string {
  const name = eventLabel.trim() || "event";
  return `Follow up — ${name} attendees`;
}

export function followUpDueTomorrowIso(now = new Date()): string {
  return addCalendarDaysIso(now.toISOString(), 1);
}

export function followUpDueDateInput(now = new Date()): string {
  return formatLocal(followUpDueTomorrowIso(now), "yyyy-MM-dd");
}

export function followUpDueChipLabel(dueIso: string, now = new Date()): string {
  const day = formatLocal(dueIso, "MMMM d, yyyy");
  const tomorrow = formatLocal(followUpDueTomorrowIso(now), "yyyy-MM-dd");
  const dueDay = formatLocal(dueIso, "yyyy-MM-dd");
  if (dueDay === tomorrow) return `Tomorrow (${day})`;
  if (dueDay === formatLocal(now, "yyyy-MM-dd")) return `Today (${day})`;
  return day;
}

export function followUpAudienceLabel(audience: EventFollowUpAudience, count: number): string {
  const labels: Record<EventFollowUpAudience, string> = {
    all: "Everyone on this roster",
    checked_in: "Checked in only",
    no_show: "No-shows",
    registered: "Registered only",
    first_timers: "First-timers",
  };
  return `${labels[audience]} (${count})`;
}

export function defaultFollowUpAudience(filter: RosterStatusFilter, hasEnded: boolean): EventFollowUpAudience {
  return followUpAudienceFromFilter(filter, hasEnded);
}

export function encodeFollowUpDescription(notes: string, meta: EventFollowUpMeta): string {
  const marker = `<!--${EVENT_FOLLOWUP_MARKER}:${JSON.stringify(meta)}-->`;
  const body = notes.trim();
  return body ? `${body}\n\n${marker}` : marker;
}

export function parseFollowUpMeta(description: string | null | undefined): EventFollowUpMeta | null {
  if (!description) return null;
  const match = description.match(/<!--cc-event-followup:({[\s\S]+?})-->/);
  if (!match?.[1]) return null;
  try {
    const parsed = JSON.parse(match[1]) as EventFollowUpMeta;
    if (parsed?.kind !== "event_followup" || parsed?.v !== 1 || !parsed.eventKey) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function stripFollowUpMarker(description: string | null | undefined): string {
  if (!description) return "";
  return description.replace(/\n*\s*<!--cc-event-followup:{[\s\S]+?}-->\s*$/, "").trim();
}

export function taskIsOpenFollowUpForEvent(
  task: { completed_at?: string | null; description?: string | null },
  eventKey: string,
): boolean {
  if (task.completed_at) return false;
  return parseFollowUpMeta(task.description)?.eventKey === eventKey;
}

export function shouldOfferFollowUp(input: {
  hasEnded: boolean;
  checkedInCount: number;
  hasOpenFollowUp: boolean;
  dismissed: boolean;
}): boolean {
  return input.hasEnded && input.checkedInCount > 0 && !input.hasOpenFollowUp && !input.dismissed;
}

export function peopleForFollowUpAudience<T extends RosterFilterPerson & { contactId: string }>(
  people: T[],
  audience: EventFollowUpAudience,
  hasEnded: boolean,
): T[] {
  return peopleMatchingRosterFilter(people, audience, hasEnded);
}

export function parseFollowUpAudienceParam(raw: string | null | undefined): EventFollowUpAudience | null {
  if (raw === "all" || raw === "checked_in" || raw === "no_show" || raw === "registered" || raw === "first_timers") {
    return raw;
  }
  return null;
}
