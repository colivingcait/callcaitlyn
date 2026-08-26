import { createClient } from "@/lib/supabase/server";
import { CONTACT_TYPE_LABELS } from "@/lib/utils";

// Sponsorship/proof-of-value reporting - deliberately separate from the
// Leads category (which is about acquisition), and from lib/data/reports.ts
// generally. Eventbrite and Jotform don't share an event identifier (see
// the classifySeries comment below), so most of this can only be split by
// the two known series (House Hacking / Women's REI), not by the specific
// monthly occurrence - except where noted.

export type EventSeries = "house_hacking" | "womens_rei";
const SERIES_LABELS: Record<EventSeries, string> = { house_hacking: "House Hacking", womens_rei: "Women's REI" };
const SERIES_LIST: EventSeries[] = ["house_hacking", "womens_rei"];

type RawActivity = { contact_id: string; source: string; occurred_at: string; metadata: Record<string, unknown> | null };

// Eventbrite tags its account (house_hacking / womens_rei) directly in
// metadata; the check-in flow (QR page, and the Jotform kiosk it replaced)
// stamps the reliable `series` field derived from which physical/printed
// check-in path was used (see lib/checkin/process-checkin.ts and
// processJotformSubmission) - never classify a check-in row by its
// event_name, which is just a human-readable label (the real Eventbrite
// event's title once one's been matched) and isn't a fixed string. The
// event_name text match below only exists for rows logged before the
// `series` field existed.
function classifySeries(a: RawActivity): EventSeries | null {
  if (a.source === "eventbrite") {
    const account = a.metadata?.eventbrite_account;
    if (account === "womens_rei") return "womens_rei";
    if (account === "house_hacking") return "house_hacking";
    return null;
  }
  if (a.source === "checkin" || a.source === "jotform") {
    const series = a.metadata?.series;
    if (series === "womens_rei") return "womens_rei";
    if (series === "house_hacking") return "house_hacking";
    // Pre-existing rows logged before `series` was tracked directly.
    const name = a.metadata?.event_name;
    if (name === "Women's REI Meetup") return "womens_rei";
    if (name === "House Hacking Meetup") return "house_hacking";
    return null;
  }
  return null;
}

function dateKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

function monthBucket(monthsFromNow: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + monthsFromNow, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + monthsFromNow + 1, 1);
  return {
    key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
    label: start.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    start,
    end,
  };
}
function lastNMonths(n: number) {
  return Array.from({ length: n }, (_, i) => monthBucket(i - (n - 1)));
}

export type EventTopicRow = { eventName: string; registrations: number };
export type EventDateRow = { date: string; series: EventSeries; count: number };
export type ShowRateMonth = { key: string; label: string; registrations: number; checkIns: number; showRate: number | null };
export type ShowRateSeries = { series: string; months: ShowRateMonth[] };
export type AttendanceTrendSeries = { series: string; months: { key: string; label: string; count: number }[] };
export type CommunitySizeRow = { series: string; uniqueAttendees: number };
export type NewVsReturningRow = { series: string; date: string; newCount: number; returningCount: number };
export type RepeatAttendanceSeries = { series: string; avgEventsPerPerson: number; distribution: { label: string; count: number }[] };
export type AudienceBreakdown = { series: string; rows: { label: string; count: number }[] };
export type EventRoiRow = {
  series: string;
  attendeeCount: number;
  convertedCount: number;
  conversionRate: number;
  grossCommission: number;
  avgDaysToConvert: number | null;
};
export type RosterEntry = { contactId: string; name: string; email: string | null; phone: string | null };
export type RosterDate = { date: string; series: EventSeries; attendees: RosterEntry[] };

export type EventsReportData = {
  topTopics: EventTopicRow[];
  attendanceByDate: EventDateRow[];
  showRate: ShowRateSeries[];
  attendanceTrend: AttendanceTrendSeries[];
  communitySize: CommunitySizeRow[];
  newVsReturning: NewVsReturningRow[];
  repeatAttendance: RepeatAttendanceSeries[];
  audienceContactType: AudienceBreakdown[];
  audienceJourneyStage: { label: string; count: number }[];
  roi: EventRoiRow[];
  roster: RosterDate[];
};

// One pass over activities/contacts/tags/deals instead of a query per
// metric - all of these views are cheap derivations of the same
// underlying event activity once it's in memory.
export async function getEventsReport(): Promise<EventsReportData> {
  const supabase = await createClient();

  const [{ data: activities }, { data: contacts }, { data: tags }, { data: contactTags }, { data: deals }] = await Promise.all([
    supabase.from("activities").select("contact_id, source, occurred_at, metadata").in("source", ["eventbrite", "checkin", "jotform"]),
    supabase.from("contacts").select("id, first_name, last_name, email, phone, contact_type").eq("archived", false),
    supabase.from("tags").select("id, name"),
    supabase.from("contact_tags").select("contact_id, tag_id"),
    supabase.from("deals").select("contact_id, status, closed_at, gross_commission").eq("status", "won"),
  ]);

  const contactById = new Map((contacts ?? []).map((c) => [c.id, c]));
  const rows = (activities ?? []) as RawActivity[];
  const registrations = rows.filter((a) => a.source === "eventbrite" && contactById.has(a.contact_id));
  const checkIns = rows.filter((a) => (a.source === "checkin" || a.source === "jotform") && contactById.has(a.contact_id));

  // --- Top event topics (Eventbrite's real per-occurrence title, all-time) ---
  const topicCounts = new Map<string, number>();
  for (const a of registrations) {
    const name = typeof a.metadata?.event_name === "string" ? a.metadata.event_name : "Unknown event";
    topicCounts.set(name, (topicCounts.get(name) ?? 0) + 1);
  }
  const topTopics = [...topicCounts.entries()]
    .map(([eventName, count]) => ({ eventName, registrations: count }))
    .sort((a, b) => b.registrations - a.registrations)
    .slice(0, 10);

  // --- Per-date attendance (each distinct Jotform check-in day = one occurrence) ---
  const attendanceByDateMap = new Map<string, { series: EventSeries; count: number }>();
  for (const a of checkIns) {
    const series = classifySeries(a);
    if (!series) continue;
    const key = `${series}:${dateKey(a.occurred_at)}`;
    const cur = attendanceByDateMap.get(key) ?? { series, count: 0 };
    cur.count += 1;
    attendanceByDateMap.set(key, cur);
  }
  const attendanceByDate = [...attendanceByDateMap.entries()]
    .map(([key, v]) => ({ date: key.split(":")[1], series: v.series, count: v.count }))
    .sort((a, b) => b.date.localeCompare(a.date));

  // --- Show rate: registrations vs check-ins, bucketed by month (approximate - see getMeetupShowRate's old caveat) ---
  const showRateMonths = lastNMonths(6);
  const showRate: ShowRateSeries[] = SERIES_LIST.map((series) => ({
    series: SERIES_LABELS[series],
    months: showRateMonths.map((m) => {
      const regInMonth = registrations.filter((a) => {
        const t = new Date(a.occurred_at).getTime();
        return t >= m.start.getTime() && t < m.end.getTime() && classifySeries(a) === series;
      }).length;
      const checkInInMonth = checkIns.filter((a) => {
        const t = new Date(a.occurred_at).getTime();
        return t >= m.start.getTime() && t < m.end.getTime() && classifySeries(a) === series;
      }).length;
      return {
        key: m.key,
        label: m.label,
        registrations: regInMonth,
        checkIns: checkInInMonth,
        showRate: regInMonth > 0 ? (checkInInMonth / regInMonth) * 100 : null,
      };
    }),
  }));

  // --- Attendance trend (check-ins per month, last 6 months) ---
  const attendanceTrend: AttendanceTrendSeries[] = SERIES_LIST.map((series) => ({
    series: SERIES_LABELS[series],
    months: showRateMonths.map((m) => ({
      key: m.key,
      label: m.label,
      count: checkIns.filter((a) => {
        const t = new Date(a.occurred_at).getTime();
        return t >= m.start.getTime() && t < m.end.getTime() && classifySeries(a) === series;
      }).length,
    })),
  }));

  // --- Cumulative unique community size (all-time distinct attendees) ---
  const communitySize: CommunitySizeRow[] = SERIES_LIST.map((series) => ({
    series: SERIES_LABELS[series],
    uniqueAttendees: new Set(checkIns.filter((a) => classifySeries(a) === series).map((a) => a.contact_id)).size,
  }));

  // --- New vs returning, for the most recent event date per series ---
  const newVsReturning: NewVsReturningRow[] = [];
  for (const series of SERIES_LIST) {
    const seriesCheckIns = checkIns.filter((a) => classifySeries(a) === series);
    if (seriesCheckIns.length === 0) continue;

    const mostRecentDate = seriesCheckIns.reduce((max, a) => {
      const d = dateKey(a.occurred_at);
      return d > max ? d : max;
    }, "");

    const priorContactIds = new Set<string>();
    const todayContactIds = new Set<string>();
    for (const a of seriesCheckIns) {
      if (dateKey(a.occurred_at) === mostRecentDate) todayContactIds.add(a.contact_id);
      else priorContactIds.add(a.contact_id);
    }

    let newCount = 0;
    let returningCount = 0;
    for (const id of todayContactIds) {
      if (priorContactIds.has(id)) returningCount += 1;
      else newCount += 1;
    }
    newVsReturning.push({ series: SERIES_LABELS[series], date: mostRecentDate, newCount, returningCount });
  }

  // --- Repeat attendance rate (distinct event-dates attended per person) ---
  const repeatAttendance: RepeatAttendanceSeries[] = SERIES_LIST.map((series) => {
    const datesByContact = new Map<string, Set<string>>();
    for (const a of checkIns) {
      if (classifySeries(a) !== series) continue;
      if (!datesByContact.has(a.contact_id)) datesByContact.set(a.contact_id, new Set());
      datesByContact.get(a.contact_id)!.add(dateKey(a.occurred_at));
    }
    const counts = [...datesByContact.values()].map((s) => s.size);
    const avg = counts.length > 0 ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;
    const distribution = [
      { label: "Attended once", count: counts.filter((c) => c === 1).length },
      { label: "Attended 2-3 times", count: counts.filter((c) => c >= 2 && c <= 3).length },
      { label: "Attended 4+ times", count: counts.filter((c) => c >= 4).length },
    ];
    return { series: SERIES_LABELS[series], avgEventsPerPerson: avg, distribution };
  });

  // --- Audience quality: contact type mix among ever-attended contacts ---
  const audienceContactType: AudienceBreakdown[] = SERIES_LIST.map((series) => {
    const attendeeIds = new Set(checkIns.filter((a) => classifySeries(a) === series).map((a) => a.contact_id));
    const counts = new Map<string, number>();
    for (const id of attendeeIds) {
      const c = contactById.get(id);
      if (!c) continue;
      counts.set(c.contact_type, (counts.get(c.contact_type) ?? 0) + 1);
    }
    const rows = [...counts.entries()]
      .map(([type, count]) => ({ label: CONTACT_TYPE_LABELS[type] ?? type, count }))
      .sort((a, b) => b.count - a.count);
    return { series: SERIES_LABELS[series], rows };
  });

  // --- Audience quality: journey stage mix (House Hacking only - the only series that asks the question) ---
  const tagIdByName = new Map((tags ?? []).map((t) => [t.name, t.id]));
  const houseHackingTagId = tagIdByName.get("House Hacking");
  const houseHackerTagId = tagIdByName.get("House Hacker");
  const firstTimeBuyerTagId = tagIdByName.get("First-Time Buyer");
  const tagIdsByContact = new Map<string, Set<string>>();
  for (const ct of contactTags ?? []) {
    if (!tagIdsByContact.has(ct.contact_id)) tagIdsByContact.set(ct.contact_id, new Set());
    tagIdsByContact.get(ct.contact_id)!.add(ct.tag_id);
  }
  const houseHackingAttendeeIds = new Set(checkIns.filter((a) => classifySeries(a) === "house_hacking").map((a) => a.contact_id));
  let researching = 0;
  let firstTime = 0;
  let alreadyHouseHacking = 0;
  for (const id of houseHackingAttendeeIds) {
    const contactTagIds = tagIdsByContact.get(id);
    if (!contactTagIds || !houseHackingTagId || !contactTagIds.has(houseHackingTagId)) continue;
    if (houseHackerTagId && contactTagIds.has(houseHackerTagId)) alreadyHouseHacking += 1;
    else if (firstTimeBuyerTagId && contactTagIds.has(firstTimeBuyerTagId)) firstTime += 1;
    else researching += 1;
  }
  const audienceJourneyStage = [
    { label: "Just researching", count: researching },
    { label: "Looking for first house hack", count: firstTime },
    { label: "Already house hacking", count: alreadyHouseHacking },
  ];

  // --- ROI: conversion rate, revenue, and time-to-convert among attendees ---
  const wonByContact = new Map<string, { closedAt: string; gross: number }[]>();
  for (const d of deals ?? []) {
    if (!d.contact_id) continue;
    if (!wonByContact.has(d.contact_id)) wonByContact.set(d.contact_id, []);
    wonByContact.get(d.contact_id)!.push({ closedAt: d.closed_at, gross: d.gross_commission ?? 0 });
  }
  const roi: EventRoiRow[] = SERIES_LIST.map((series) => {
    const seriesCheckIns = checkIns.filter((a) => classifySeries(a) === series);
    const firstAttendanceByContact = new Map<string, string>();
    for (const a of seriesCheckIns) {
      const existing = firstAttendanceByContact.get(a.contact_id);
      if (!existing || a.occurred_at < existing) firstAttendanceByContact.set(a.contact_id, a.occurred_at);
    }
    const attendeeIds = [...firstAttendanceByContact.keys()];
    let convertedCount = 0;
    let grossCommission = 0;
    const daysToConvert: number[] = [];
    for (const id of attendeeIds) {
      const wonDeals = wonByContact.get(id);
      if (!wonDeals || wonDeals.length === 0) continue;
      convertedCount += 1;
      grossCommission += wonDeals.reduce((sum, d) => sum + d.gross, 0);
      const firstAttendance = new Date(firstAttendanceByContact.get(id)!).getTime();
      const earliestClose = Math.min(...wonDeals.map((d) => new Date(d.closedAt).getTime()));
      if (earliestClose >= firstAttendance) daysToConvert.push((earliestClose - firstAttendance) / (24 * 60 * 60 * 1000));
    }
    return {
      series: SERIES_LABELS[series],
      attendeeCount: attendeeIds.length,
      convertedCount,
      conversionRate: attendeeIds.length > 0 ? (convertedCount / attendeeIds.length) * 100 : 0,
      grossCommission,
      avgDaysToConvert: daysToConvert.length > 0 ? daysToConvert.reduce((a, b) => a + b, 0) / daysToConvert.length : null,
    };
  });

  // --- Roster: attendee list for the 12 most recent event dates ---
  const rosterByKey = new Map<string, { series: EventSeries; date: string; contactIds: Set<string> }>();
  for (const a of checkIns) {
    const series = classifySeries(a);
    if (!series) continue;
    const date = dateKey(a.occurred_at);
    const key = `${series}:${date}`;
    if (!rosterByKey.has(key)) rosterByKey.set(key, { series, date, contactIds: new Set() });
    rosterByKey.get(key)!.contactIds.add(a.contact_id);
  }
  const roster: RosterDate[] = [...rosterByKey.values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12)
    .map((r) => ({
      date: r.date,
      series: r.series,
      attendees: [...r.contactIds]
        .map((id) => contactById.get(id))
        .filter((c): c is NonNullable<typeof c> => !!c)
        .map((c) => ({ contactId: c.id, name: `${c.first_name} ${c.last_name}`.trim(), email: c.email, phone: c.phone })),
    }));

  return {
    topTopics,
    attendanceByDate,
    showRate,
    attendanceTrend,
    communitySize,
    newVsReturning,
    repeatAttendance,
    audienceContactType,
    audienceJourneyStage,
    roi,
    roster,
  };
}
