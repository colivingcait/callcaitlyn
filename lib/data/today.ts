import { isPast } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { relativeTime, isTodayLocal, endOfLocalDayIso } from "@/lib/format-time";
import { filterByQueue } from "@/lib/crm/contact-queue-filter";
import { listContacts } from "@/lib/data/contacts";
import { listNewLeadsQueue } from "@/lib/data/new-leads";
import { listWonDeals, listPendingDeals } from "@/lib/data/commissions";
import { listPendingBookingRequests, listUpcomingApprovedBookingRequests } from "@/lib/data/scheduling";
import { computeDeals, summarizeDeals, capYearKey, capYearStart, KW_CAP } from "@/lib/crm/commission";
import { isTodayWorkContact } from "@/lib/crm/today-eligible";
import { listConversations } from "@/lib/data/messages";
import { getEventsData, upcomingEventsFromData, type EventEntry } from "@/lib/data/events";
import { eventCadenceDues, upcomingEventRows, type EventCadenceDue, type EventCadenceInput } from "@/lib/crm/today-v1";
import type { PipelineStage } from "@/types/database";

export type WorklistPerson = {
  id: string;
  name: string;
  phone: string | null;
  email?: string | null;
  meta: string;
  late: boolean;
  activityId?: string;
  // Prefills /messages/[id]?draft= for New/uncontacted first-touch SMS.
  smsDraft?: string;
};

// "Calls" - contacts.next_follow_up_at due or overdue. Spam-flagged
// contacts are excluded here (same as Quiet/New) so realtor robocalls
// cannot land in Overdue / Call today or win Up Next via pickUpNext.
async function getCallsGroup(): Promise<WorklistPerson[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, phone, email, lead_source, next_follow_up_at")
    .eq("archived", false)
    .eq("known_personally", false)
    .eq("spam", false)
    .not("next_follow_up_at", "is", null)
    .lte("next_follow_up_at", endOfLocalDayIso())
    .order("next_follow_up_at", { ascending: true })
    .limit(50);

  return (data ?? [])
    .filter((c) => isTodayWorkContact(c))
    .slice(0, 30)
    .map((c) => {
    const due = new Date(c.next_follow_up_at as string);
    const today = isTodayLocal(c.next_follow_up_at as string);
    const overdue = isPast(due) && !today;
    const meta = overdue ? `${relativeTime(due)} · follow-up` : today ? "Due today" : `Due ${relativeTime(due)}`;
    return { id: c.id, name: `${c.first_name} ${c.last_name}`.trim(), phone: c.phone, meta, late: overdue };
  });
}

// Same listConversations owed set as the sidebar badge and /messages —
// not a second query with a different window/filter. Preview copy stays
// Today-shaped (WorklistPerson).
async function getRepliesOwedGroup(): Promise<WorklistPerson[]> {
  const conversations = await listConversations({ filter: "owed" });
  return conversations.map((c) => {
    const activity = c.owedActivity ?? c.lastActivity;
    const preview =
      activity.type === "call"
        ? "Missed call"
        : activity.body
          ? `"${activity.body.slice(0, 60)}${activity.body.length > 60 ? "…" : ""}"`
          : "Texted you";
    return {
      id: c.contact.id,
      name: `${c.contact.first_name} ${c.contact.last_name}`.trim(),
      phone: c.contact.phone,
      meta: `${preview} · ${relativeTime(activity.occurred_at)}`,
      late: false,
      activityId: activity.id,
    };
  });
}

export type WorklistTask = {
  id: string;
  title: string;
  dueAt: string | null;
  contactId: string | null;
  contactName: string | null;
  phone: string | null;
  late: boolean;
};

async function getMyTasksGroup(): Promise<WorklistTask[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select("id, title, due_at, contact_id, contacts(first_name, last_name, phone)")
    .is("completed_at", null)
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(30);

  return (data ?? []).map((t) => {
    const contact = t.contacts as unknown as { first_name: string; last_name: string; phone: string | null } | null;
    const late = t.due_at ? isPast(new Date(t.due_at)) && !isTodayLocal(t.due_at) : false;
    return {
      id: t.id,
      title: t.title,
      dueAt: t.due_at,
      contactId: t.contact_id,
      contactName: contact ? `${contact.first_name} ${contact.last_name}`.trim() : null,
      phone: contact?.phone ?? null,
      late,
    };
  });
}

async function getRegisteredNoFollowUpGroup(stages: PipelineStage[]): Promise<WorklistPerson[]> {
  const contacts = (await listContacts({})).filter((c) => !c.known_personally);
  const matched = await filterByQueue(contacts, "no_followup_after_registration", stages);
  return matched
    .filter((c) => isTodayWorkContact(c))
    .slice(0, 20)
    .map((c) => ({
      id: c.id,
      name: `${c.first_name} ${c.last_name}`.trim(),
      phone: c.phone,
      email: c.email,
      meta: c.last_event_name ? `Registered · ${c.last_event_name}` : "Registered, no follow-up yet",
      late: false,
    }));
}

async function getQuietLeadsGroup(): Promise<WorklistPerson[]> {
  const supabase = await createClient();
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const { data } = await supabase
    .from("activities")
    .select("contact_id, type, occurred_at, contacts!inner(id, first_name, last_name, phone, email, lead_source, archived, known_personally, spam)")
    .in("type", ["call", "text", "email"])
    .eq("contacts.archived", false)
    .eq("contacts.known_personally", false)
    .eq("contacts.spam", false)
    .order("occurred_at", { ascending: false })
    .limit(3000);

  const seen = new Set<string>();
  const quiet: WorklistPerson[] = [];
  for (const row of data ?? []) {
    const contact = row.contacts as unknown as {
      id: string;
      first_name: string;
      last_name: string;
      phone: string | null;
      email: string | null;
      lead_source: string | null;
      spam: boolean;
    } | null;
    if (!contact || seen.has(contact.id)) continue;
    if (!isTodayWorkContact(contact)) continue;
    seen.add(contact.id);
    if (new Date(row.occurred_at as string).getTime() >= cutoff) continue;
    const verb = row.type === "call" ? "called" : row.type === "email" ? "emailed" : "texted";
    quiet.push({
      id: contact.id,
      name: `${contact.first_name} ${contact.last_name}`.trim(),
      phone: contact.phone,
      meta: `${verb} ${relativeTime(row.occurred_at as string)}`,
      late: false,
    });
    if (quiet.length >= 30) break;
  }
  return quiet;
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

async function getStatStrip(stages: PipelineStage[]) {
  const supabase = await createClient();
  // "How many calls have I actually made today" - the single most basic
  // accountability number for a phone-first agent working in short bursts,
  // and nothing tracked it anywhere. Queried over the last 36h then
  // filtered to true calendar-day-in-Eastern-time with isTodayLocal (same
  // pattern getCallsGroup already uses), rather than a UTC day boundary
  // that would cut off early-morning/late-evening calls incorrectly.
  const [{ data: contacts }, { count: newLeadsWeek }, { data: recentCalls }] = await Promise.all([
    supabase.from("contacts").select("id, stage_id").eq("archived", false),
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("archived", false).gte("lead_date", daysAgo(7)),
    supabase.from("activities").select("occurred_at").eq("type", "call").eq("direction", "outbound").gte("occurred_at", daysAgo(1.5)),
  ]);
  const callsToday = (recentCalls ?? []).filter((c) => isTodayLocal(c.occurred_at as string)).length;

  const stageCounts = new Map<string, number>();
  for (const c of contacts ?? []) {
    if (!c.stage_id) continue;
    stageCounts.set(c.stage_id, (stageCounts.get(c.stage_id) ?? 0) + 1);
  }
  const activeStageIds = new Set(stages.filter((s) => !s.is_closed_won && !s.is_closed_lost && !s.is_trash).map((s) => s.id));
  const totalActive = (contacts ?? []).filter((c) => c.stage_id && activeStageIds.has(c.stage_id)).length;
  const hotStage = stages.find((s) => s.name.toLowerCase().includes("hot"));
  const hotCount = hotStage ? stageCounts.get(hotStage.id) ?? 0 : 0;
  const underContractStage = stages.find((s) => s.is_under_contract);
  const underContractCount = underContractStage ? stageCounts.get(underContractStage.id) ?? 0 : 0;

  return { totalActive, newLeadsWeek: newLeadsWeek ?? 0, hotCount, underContractCount, stageCounts, callsToday };
}

async function getCommissionYearSummary() {
  const [won, pending] = await Promise.all([listWonDeals(), listPendingDeals()]);
  const currentKey = capYearKey(new Date());
  const yearStart = capYearStart(new Date());
  const wonThisYear = computeDeals(won.filter((d) => capYearKey(new Date(d.closed_at)) === currentKey));
  const pendingThisYear = computeDeals(pending.filter((d) => new Date(d.closed_at) >= yearStart));
  const stats = summarizeDeals(wonThisYear);
  const kwCapLeft = Math.max(KW_CAP - stats.totalKW, 0);
  const pendingNet = pendingThisYear.reduce((sum, d) => sum + d.netCommission, 0);

  return {
    netCommission: stats.netCommissionIncome,
    underContractNet: pendingNet,
    kwCapLeft,
    kwCapUsedPct: Math.min(100, Math.round(((KW_CAP - kwCapLeft) / KW_CAP) * 100)),
  };
}

export type TodayCalendarItem = {
  id: string;
  title: string;
  startsAt: string;
  href: string;
  meta?: string;
  registeredCount?: number;
};

function calendarItemFromEntry(event: EventEntry): TodayCalendarItem {
  return {
    id: event.key,
    title: event.label,
    startsAt: event.startsAt ?? event.date,
    href: `/events/${encodeURIComponent(event.key)}`,
    meta: event.seriesLabel,
    registeredCount: event.counts.registered,
  };
}

function cadenceInputFromEntries(upcoming: EventEntry[], past: EventEntry[]): EventCadenceInput[] {
  const pastAttendeesBySeries = new Map<string, Set<string>>();
  for (const event of past) {
    const ids = pastAttendeesBySeries.get(event.series) ?? new Set<string>();
    for (const person of event.people) {
      if (person.attended) ids.add(person.contactId);
    }
    pastAttendeesBySeries.set(event.series, ids);
  }
  return upcoming.map((event) => ({
    key: event.key,
    label: event.label,
    startsAt: event.startsAt,
    date: event.date,
    registrantIds: event.people.filter((person) => person.registered).map((person) => person.contactId),
    pastAttendeeIds: [...(pastAttendeesBySeries.get(event.series) ?? [])],
    textDaysBefore: event.cadenceTextDaysBefore,
    showOnToday: event.cadenceShowOnToday,
  }));
}

export async function getTodayData() {
  const supabase = await createClient();
  const { data: stagesData } = await supabase.from("pipeline_stages").select("*").order("sort_order", { ascending: true });
  const stages = (stagesData ?? []) as PipelineStage[];

  const [calls, repliesOwedResult, myTasks, registeredNoFollowUp, statStrip, commissionYear, newLeads, bookingRequests, quietLeads, spamConversations, upcomingMeetings, crmEvents] =
    await Promise.all([
      getCallsGroup(),
      getRepliesOwedGroup(),
      getMyTasksGroup(),
      getRegisteredNoFollowUpGroup(stages),
      getStatStrip(stages),
      getCommissionYearSummary(),
      listNewLeadsQueue(),
      listPendingBookingRequests(),
      getQuietLeadsGroup(),
      listConversations({ spam: true }),
      listUpcomingApprovedBookingRequests(),
      getEventsData(),
    ]);

  const upcomingEntries = upcomingEventsFromData(crmEvents);
  const upcomingCrmEvents: TodayCalendarItem[] = upcomingEventRows(upcomingEntries).map(calendarItemFromEntry);
  const cadenceDues: EventCadenceDue[] = eventCadenceDues(
    cadenceInputFromEntries(
      upcomingEntries,
      crmEvents.events.filter((event) => event.hasEnded),
    ),
  );

  const calendar: TodayCalendarItem[] = [
    ...upcomingCrmEvents,
    ...upcomingMeetings
      .filter((m) => m.starts_at)
      .map((m) => ({
        id: `meeting-${m.id}`,
        title: m.contact_name ? m.contact_name : m.visitor_name || "Client meeting",
        startsAt: m.starts_at as string,
        href: "/scheduling",
        meta: "Booked meeting",
      })),
  ].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  return {
    stages,
    calls,
    repliesOwed: repliesOwedResult,
    myTasks,
    registeredNoFollowUp,
    statStrip,
    commissionYear,
    newLeads: newLeads.contacts,
    newLeadsError: newLeads.error,
    bookingRequests,
    quietLeads,
    spamFilteredCount: spamConversations.length,
    calendar,
    upcomingCrmEvents,
    cadenceDues,
  };
}
