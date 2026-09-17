import { isPast } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { relativeTime, isTodayLocal, endOfLocalDayIso } from "@/lib/format-time";
import { filterByQueue } from "@/lib/crm/contact-queue-filter";
import { listContacts } from "@/lib/data/contacts";
import { listNewLeadsQueue } from "@/lib/data/new-leads";
import { listWonDeals, listPendingDeals } from "@/lib/data/commissions";
import { listPendingBookingRequests } from "@/lib/data/scheduling";
import { createAdminClient } from "@/lib/supabase/admin";
import { listTodayGoogleEvents, type CalendarFeedStatus } from "@/lib/google/calendar";
import { computeDeals, summarizeDeals, capYearKey, capYearStart, KW_CAP } from "@/lib/crm/commission";
import { conversationOwedFromHistory } from "@/lib/crm/message-owed";
import { isSpamLikeMissedCall, isTodayWorkContact } from "@/lib/crm/today-eligible";
import { listAllowlistedPhoneKeys } from "@/lib/crm/spam-signals";
import { listConversations } from "@/lib/data/messages";
import type { PipelineStage } from "@/types/database";

export type WorklistPerson = { id: string; name: string; phone: string | null; email?: string | null; meta: string; late: boolean; activityId?: string };

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

// "Replies owed" - last inbound text on a thread with no outbound after
// it. Nothing in the app reads activities.direction in bulk today; this
// is a new aggregation, same shape as contact-queue-filter's
// fetchActivityAggregates (one unscoped-ish select, reduce in JS).
//
// needs_reply === false (the AI classifier's positive read that this was
// just a conversational close - "have a good night!", "ok that works")
// is the only thing that hides a row; null (not evaluated - AI off, the
// call failed, or the row predates this column) still shows, same
// fail-open posture as everywhere else uncertain signal gets surfaced
// rather than silently dropped.
async function getRepliesOwedGroup(): Promise<{ people: WorklistPerson[]; hiddenSpamLikeCount: number }> {
  const supabase = await createClient();
  const allowlisted = await listAllowlistedPhoneKeys(supabase);
  const { data } = await supabase
    .from("activities")
    .select("id, contact_id, type, direction, occurred_at, body, needs_reply, reply_dismissed_at, metadata, contacts!inner(id, first_name, last_name, phone, email, lead_source, archived, known_personally, spam)")
    .in("type", ["text", "call"])
    .eq("contacts.archived", false)
    .eq("contacts.known_personally", false)
    .eq("contacts.spam", false)
    .order("occurred_at", { ascending: false })
    .limit(1000);

  type ContactRow = {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    email: string | null;
    lead_source: string | null;
    spam: boolean;
  };

  const grouped = new Map<string, { contact: ContactRow; rows: NonNullable<typeof data> }>();
  for (const row of data ?? []) {
    const contact = row.contacts as unknown as ContactRow | null;
    if (!contact) continue;
    const entry = grouped.get(contact.id);
    if (entry) entry.rows.push(row);
    else grouped.set(contact.id, { contact, rows: [row] });
  }

  const owed: WorklistPerson[] = [];
  let hiddenSpamLikeCount = 0;
  for (const { contact, rows } of grouped.values()) {
    const { owed: isOwed, activity } = conversationOwedFromHistory(rows);
    if (!isOwed || !activity) continue;
    if (isSpamLikeMissedCall(contact, activity, allowlisted)) {
      hiddenSpamLikeCount += 1;
      continue;
    }
    const preview =
      activity.type === "call"
        ? "Missed call"
        : activity.body
          ? `"${activity.body.slice(0, 60)}${activity.body.length > 60 ? "…" : ""}"`
          : "Texted you";
    owed.push({
      id: contact.id,
      name: `${contact.first_name} ${contact.last_name}`.trim(),
      phone: contact.phone,
      meta: `${preview} · ${relativeTime(activity.occurred_at)}`,
      late: false,
      activityId: activity.id,
    });
  }
  return { people: owed, hiddenSpamLikeCount };
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
    .select("id, title, due_at, contact_id, contacts(first_name, last_name, phone, spam)")
    .is("completed_at", null)
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(30);

  return (data ?? [])
    .filter((t) => {
      const contact = t.contacts as unknown as { spam?: boolean } | null;
      return !contact?.spam;
    })
    .map((t) => {
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
    supabase.from("contacts").select("id, stage_id").eq("archived", false).eq("spam", false),
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("archived", false).eq("spam", false).gte("lead_date", daysAgo(7)),
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
  allDay?: boolean;
};

export type { CalendarFeedStatus };

async function getGoogleCalendarFeed(ownerId: string): Promise<{ calendar: TodayCalendarItem[]; calendarStatus: CalendarFeedStatus }> {
  if (!ownerId) return { calendar: [], calendarStatus: "disconnected" };
  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const feed = await listTodayGoogleEvents(createAdminClient(), ownerId, timeMin, timeMax);
  if (feed.status !== "ok") return { calendar: [], calendarStatus: feed.status };

  return {
    calendarStatus: "ok",
    calendar: feed.events.slice(0, 20).map((e) => ({
      id: e.id,
      title: e.title,
      startsAt: e.startAt,
      href: e.htmlLink || "https://calendar.google.com",
      meta: e.allDay ? "All day" : e.location ?? undefined,
      allDay: e.allDay,
    })),
  };
}

export async function getTodayData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: stagesData } = await supabase.from("pipeline_stages").select("*").order("sort_order", { ascending: true });
  const stages = (stagesData ?? []) as PipelineStage[];

  const [calls, repliesOwedResult, myTasks, registeredNoFollowUp, statStrip, commissionYear, newLeads, bookingRequests, quietLeads, spamConversations, googleCal] =
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
      getGoogleCalendarFeed(user?.id ?? ""),
    ]);

  return {
    stages,
    calls,
    repliesOwed: repliesOwedResult.people,
    myTasks,
    registeredNoFollowUp,
    statStrip,
    commissionYear,
    newLeads: newLeads.contacts,
    newLeadsError: newLeads.error,
    bookingRequests,
    quietLeads,
    spamFilteredCount: spamConversations.length,
    calendar: googleCal.calendar,
    calendarStatus: googleCal.calendarStatus,
  };
}
