import { calendarDaysFromToday, EMAIL_INVITE_DAYS_BEFORE, TEXT_REMINDER_DAYS_BEFORE } from "@/lib/crm/today-v1";
import { MESSAGE_TEMPLATE_CATEGORIES } from "@/lib/crm/event-text-templates";
import { formatLocal } from "@/lib/format-time";

export { EMAIL_INVITE_DAYS_BEFORE, TEXT_REMINDER_DAYS_BEFORE };

export type FirstTimerPerson = {
  contactId: string;
  registered: boolean;
  attended: boolean;
  attendanceNumber: number;
};

export type FirstTimerEvent = {
  series: string;
  hasEnded: boolean;
  people: FirstTimerPerson[];
};

export function campaignsBlastHref(contactIds: string[]): string {
  const ids = [...new Set(contactIds.filter(Boolean))];
  return `/sequences?ids=${encodeURIComponent(ids.join(","))}`;
}

export function parseCampaignIdsParam(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];
}

export function isFirstTimerPerson(
  person: FirstTimerPerson,
  event: Pick<FirstTimerEvent, "series" | "hasEnded">,
  pastEvents: FirstTimerEvent[],
): boolean {
  if (event.hasEnded) return person.attended && person.attendanceNumber === 1;
  const everAttended = new Set<string>();
  for (const past of pastEvents) {
    if (past.series !== event.series) continue;
    for (const row of past.people) {
      if (row.attended) everAttended.add(row.contactId);
    }
  }
  return person.registered && !everAttended.has(person.contactId);
}

export function firstTimerCountForEvent(event: FirstTimerEvent, pastEvents: FirstTimerEvent[]): number {
  return event.people.filter((person) => isFirstTimerPerson(person, event, pastEvents)).length;
}

export function attachFirstTimerCounts<T extends FirstTimerEvent>(events: T[]): (T & { firstTimerCount: number })[] {
  const past = events.filter((event) => event.hasEnded);
  return events.map((event) => ({ ...event, firstTimerCount: firstTimerCountForEvent(event, past) }));
}

export function withFirstTimerFlags<T extends FirstTimerEvent>(
  events: T[],
): (T & { people: (T["people"][number] & { isFirstTimer: boolean })[] })[] {
  const past = events.filter((event) => event.hasEnded);
  return events.map((event) => ({
    ...event,
    people: event.people.map((person) => ({ ...person, isFirstTimer: isFirstTimerPerson(person, event, past) })),
  }));
}

// Past-event roster chips (Nico / Caitlyn locked): All · Checked in ·
// No-show · Registered · First-timers. Default past workflow is Checked
// in so no-shows stay out until she flips the filter.
export type RosterStatusFilter = "all" | "checked_in" | "no_show" | "registered" | "first_timers";

export type RosterFilterPerson = {
  registered: boolean;
  attended: boolean;
  isFirstTimer?: boolean;
};

export function defaultRosterFilter(hasEnded: boolean): RosterStatusFilter {
  return hasEnded ? "checked_in" : "all";
}

export function matchesRosterFilter(person: RosterFilterPerson, filter: RosterStatusFilter, hasEnded: boolean): boolean {
  if (filter === "all") return true;
  if (filter === "checked_in") return person.attended;
  if (filter === "no_show") return hasEnded && person.registered && !person.attended;
  if (filter === "registered") return person.registered && !person.attended;
  return Boolean(person.isFirstTimer);
}

export function rosterFilterCounts(people: RosterFilterPerson[], hasEnded: boolean): Record<RosterStatusFilter, number> {
  return {
    all: people.length,
    checked_in: people.filter((person) => person.attended).length,
    no_show: hasEnded ? people.filter((person) => person.registered && !person.attended).length : 0,
    registered: people.filter((person) => person.registered && !person.attended).length,
    first_timers: people.filter((person) => person.isFirstTimer).length,
  };
}

export function peopleMatchingRosterFilter<T extends RosterFilterPerson>(
  people: T[],
  filter: RosterStatusFilter,
  hasEnded: boolean,
): T[] {
  return people.filter((person) => matchesRosterFilter(person, filter, hasEnded));
}

export function followUpAudienceFromFilter(filter: RosterStatusFilter, hasEnded: boolean): RosterStatusFilter {
  if (filter === "all") return hasEnded ? "checked_in" : "registered";
  return filter;
}

export function eventsHubStats(
  events: { startsAt: string | null; date: string; hasEnded: boolean; counts: { registered: number; attended: number } }[],
  now = new Date(),
) {
  const monthKey = formatLocal(now, "yyyy-MM");
  const thisMonth = events.filter((event) => formatLocal(event.startsAt ?? event.date, "yyyy-MM") === monthKey);
  const registeredThisMonth = thisMonth.reduce((sum, event) => sum + event.counts.registered, 0);
  const pastWithRegs = events.filter((event) => event.hasEnded && event.counts.registered > 0);
  const registered = pastWithRegs.reduce((sum, event) => sum + event.counts.registered, 0);
  const attended = pastWithRegs.reduce((sum, event) => sum + event.counts.attended, 0);
  return {
    registeredThisMonth,
    avgShowUp: registered > 0 ? Math.round((attended / registered) * 100) : 0,
  };
}

export function eventPlaceLabel(location: string | null | undefined, seriesLabel: string): string {
  const trimmed = location?.trim();
  return trimmed || seriesLabel;
}

export function rosterStatusLabel(
  person: { registered: boolean; attended: boolean },
  hasEnded: boolean,
): "Registered" | "Checked in" | "No-show" | "Walk-in" {
  if (person.attended && person.registered) return "Checked in";
  if (person.attended) return "Walk-in";
  if (person.registered) return hasEnded ? "No-show" : "Registered";
  return "Registered";
}

export function eventRosterTextDraft(account: string | null | undefined, eventName: string, daysUntil: number): string {
  const preEvent = MESSAGE_TEMPLATE_CATEGORIES.find((category) => category.key === "pre_event");
  const followUp = MESSAGE_TEMPLATE_CATEGORIES.find((category) => category.key === "follow_up");
  if (daysUntil < 0) {
    return followUp?.options[0]?.build(account, eventName) ?? `Hi {{first_name}} — thanks for being part of ${eventName}.`;
  }
  if (daysUntil <= 1) {
    return preEvent?.options.find((option) => option.label === "Day before")?.build(account, eventName) ?? "";
  }
  if (daysUntil <= 4) {
    return (
      preEvent?.options.find((option) => option.label === "Few days before (recent sign-ups)")?.build(account, eventName) ??
      ""
    );
  }
  return preEvent?.options.find((option) => option.label === "Week before")?.build(account, eventName) ?? "";
}

export function registrantIdsForMessage(people: { contactId: string; registered: boolean; attended: boolean }[]): string[] {
  return [...new Set(people.filter((person) => person.registered || person.attended).map((person) => person.contactId))];
}

export function daysUntilEvent(startsAt: string | null | undefined, date: string, now = new Date()): number {
  return calendarDaysFromToday(startsAt ?? date, now);
}
