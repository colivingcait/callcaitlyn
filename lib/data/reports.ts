import { createClient } from "@/lib/supabase/server";
import type { Period } from "@/lib/data/metrics";
import { CONTACT_TYPE_LABELS } from "@/lib/utils";

const PERIOD_DAYS: Record<Period, number> = { week: 7, month: 30 };

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

type MonthBucket = { key: string; label: string; start: Date; end: Date };

function monthBucket(monthsFromNow: number): MonthBucket {
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

// Calendar months, not rolling 30-day windows - "is this source trending up"
// reads naturally as Jan/Feb/Mar, and lines up with how the commission/deal
// numbers below are usually thought about.
function lastNMonths(n: number): MonthBucket[] {
  return Array.from({ length: n }, (_, i) => monthBucket(i - (n - 1)));
}

function nextNMonths(n: number): MonthBucket[] {
  return Array.from({ length: n }, (_, i) => monthBucket(i));
}

export type NewLeadsBySource = { source: string; count: number };

export type NewLeadsReportData = {
  total: number;
  bySource: NewLeadsBySource[];
};

// Filtered on lead_date (the lead's real original date), not created_at (when
// the row was inserted) - a bulk CSV import inserts everything "now", which
// would otherwise make a months-old backfilled contact look like it just
// came in this week. Same rolling window as the dashboard's tiles and the
// Accountability metrics, so "this week" means the same thing everywhere.
export async function getNewLeadsReport(period: Period): Promise<NewLeadsReportData> {
  const supabase = await createClient();
  const { data: contacts } = await supabase
    .from("contacts")
    .select("lead_source")
    .eq("archived", false)
    .gte("lead_date", daysAgo(PERIOD_DAYS[period]));

  const countBySource = new Map<string, number>();
  for (const c of contacts ?? []) {
    const source = c.lead_source?.trim() || "Unknown";
    countBySource.set(source, (countBySource.get(source) ?? 0) + 1);
  }

  return {
    total: contacts?.length ?? 0,
    bySource: [...countBySource.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export type LeadSourceReportRow = {
  source: string;
  contactCount: number;
  convertedCount: number;
  conversionRate: number;
  wonDealCount: number;
  grossCommission: number;
};

// "Converted" = the contact has at least one won deal (same definition the
// dashboard's conversion-rate metric uses) - counted as a distinct contact
// even if they've closed more than once, since the ROI question here is
// "did this source produce a client," not "how many deals." Gross
// commission is the raw, uncapped deal amount rather than the
// cap-clamped net figure the commission tracker shows - that figure only
// makes sense walked across every deal together in date order (see
// computeDeals), which is more coupling than a marketing-spend report
// needs; this just answers "which sources bring in the most business."
export async function getLeadSourceReport(): Promise<LeadSourceReportRow[]> {
  const supabase = await createClient();
  const [{ data: contacts }, { data: deals }] = await Promise.all([
    supabase.from("contacts").select("id, lead_source").eq("archived", false),
    supabase.from("deals").select("contact_id, gross_commission").eq("status", "won"),
  ]);

  const sourceByContactId = new Map<string, string>();
  const contactCountBySource = new Map<string, number>();
  for (const c of contacts ?? []) {
    const source = c.lead_source?.trim() || "Unknown";
    sourceByContactId.set(c.id, source);
    contactCountBySource.set(source, (contactCountBySource.get(source) ?? 0) + 1);
  }

  const convertedIdsBySource = new Map<string, Set<string>>();
  const wonDealCountBySource = new Map<string, number>();
  const grossCommissionBySource = new Map<string, number>();
  for (const d of deals ?? []) {
    if (!d.contact_id) continue;
    const source = sourceByContactId.get(d.contact_id) ?? "Unknown";
    const converted = convertedIdsBySource.get(source) ?? new Set<string>();
    converted.add(d.contact_id);
    convertedIdsBySource.set(source, converted);
    wonDealCountBySource.set(source, (wonDealCountBySource.get(source) ?? 0) + 1);
    grossCommissionBySource.set(source, (grossCommissionBySource.get(source) ?? 0) + (d.gross_commission ?? 0));
  }

  const sources = new Set([...contactCountBySource.keys(), ...convertedIdsBySource.keys()]);

  return [...sources]
    .map((source) => {
      const contactCount = contactCountBySource.get(source) ?? 0;
      const convertedCount = convertedIdsBySource.get(source)?.size ?? 0;
      return {
        source,
        contactCount,
        convertedCount,
        conversionRate: contactCount > 0 ? (convertedCount / contactCount) * 100 : 0,
        wonDealCount: wonDealCountBySource.get(source) ?? 0,
        grossCommission: grossCommissionBySource.get(source) ?? 0,
      };
    })
    .sort((a, b) => b.contactCount - a.contactCount);
}

export type CommissionTrendMonth = { key: string; label: string; grossCommission: number; dealCount: number };

// Gross, not net - same tradeoff as getLeadSourceReport (net requires
// walking every deal in a cap year in closing-date order, which only gives
// a correct number across the full history, not a single month in
// isolation).
export async function getCommissionTrend(): Promise<CommissionTrendMonth[]> {
  const supabase = await createClient();
  const months = lastNMonths(6);
  const { data: deals } = await supabase
    .from("deals")
    .select("gross_commission, closed_at")
    .eq("status", "won")
    .gte("closed_at", months[0].start.toISOString());

  return months.map((m) => {
    const inMonth = (deals ?? []).filter((d) => {
      const t = new Date(d.closed_at).getTime();
      return t >= m.start.getTime() && t < m.end.getTime();
    });
    return {
      key: m.key,
      label: m.label,
      grossCommission: inMonth.reduce((sum, d) => sum + (d.gross_commission ?? 0), 0),
      dealCount: inMonth.length,
    };
  });
}

export type DealForecastMonth = { key: string; label: string; grossCommission: number; dealCount: number };
export type DealForecastData = { months: DealForecastMonth[]; otherCount: number; otherGrossCommission: number };

// Pending deals grouped by expected_closing_date - closed_at is the
// fallback (it doubles as the projected close date on a pending deal, same
// as it's the actual close date on a won one). Anything that doesn't land
// in the next 6 months (past-due pending deals included) goes in "other"
// rather than silently vanishing from the total.
export async function getDealForecast(): Promise<DealForecastData> {
  const supabase = await createClient();
  const { data: deals } = await supabase.from("deals").select("gross_commission, expected_closing_date, closed_at").eq("status", "pending");

  const months = nextNMonths(6);
  const monthResults: DealForecastMonth[] = months.map((m) => ({ key: m.key, label: m.label, grossCommission: 0, dealCount: 0 }));
  let otherCount = 0;
  let otherGrossCommission = 0;

  for (const d of deals ?? []) {
    const dateStr = d.expected_closing_date ?? d.closed_at;
    const t = dateStr ? new Date(dateStr).getTime() : NaN;
    const idx = months.findIndex((m) => t >= m.start.getTime() && t < m.end.getTime());
    if (idx === -1) {
      otherCount += 1;
      otherGrossCommission += d.gross_commission ?? 0;
    } else {
      monthResults[idx].dealCount += 1;
      monthResults[idx].grossCommission += d.gross_commission ?? 0;
    }
  }

  return { months: monthResults, otherCount, otherGrossCommission };
}

export type ContactTypeBreakdownRow = { type: string; label: string; count: number };

export async function getContactTypeBreakdown(): Promise<ContactTypeBreakdownRow[]> {
  const supabase = await createClient();
  const { data: contacts } = await supabase.from("contacts").select("contact_type").eq("archived", false);

  const counts = new Map<string, number>();
  for (const c of contacts ?? []) {
    counts.set(c.contact_type, (counts.get(c.contact_type) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([type, count]) => ({ type, label: CONTACT_TYPE_LABELS[type] ?? type, count }))
    .sort((a, b) => b.count - a.count);
}

export type SpeedToLeadBucket = { label: string; count: number };

// Same activities query shape as speedToLeadFor in lib/data/metrics.ts, so
// this distribution and that average never disagree about what counts as
// "contacted" - it's the same underlying events, just bucketed instead of
// averaged (which hides how much one slow outlier skews the mean).
export async function getSpeedToLeadDistribution(period: Period): Promise<SpeedToLeadBucket[]> {
  const supabase = await createClient();
  const start = daysAgo(PERIOD_DAYS[period]);
  const end = daysAgo(0);

  const { data: newContacts } = await supabase
    .from("contacts")
    .select("id, created_at")
    .eq("archived", false)
    .gte("created_at", start)
    .lt("created_at", end);

  const contactIds = (newContacts ?? []).map((c) => c.id);
  const firstContactByContact = new Map<string, string>();
  if (contactIds.length > 0) {
    const { data: outbound } = await supabase
      .from("activities")
      .select("contact_id, occurred_at")
      .in("contact_id", contactIds)
      .eq("direction", "outbound")
      .in("type", ["call", "text", "email"])
      .order("occurred_at", { ascending: true });
    for (const a of outbound ?? []) {
      if (!firstContactByContact.has(a.contact_id)) firstContactByContact.set(a.contact_id, a.occurred_at);
    }
  }

  const buckets = { withinHour: 0, sameDay: 0, withinWeek: 0, longer: 0, never: 0 };
  for (const c of newContacts ?? []) {
    const firstOutbound = firstContactByContact.get(c.id);
    if (!firstOutbound) {
      buckets.never += 1;
      continue;
    }
    const hours = (new Date(firstOutbound).getTime() - new Date(c.created_at).getTime()) / 3_600_000;
    if (hours < 0) buckets.never += 1;
    else if (hours < 1) buckets.withinHour += 1;
    else if (hours < 24) buckets.sameDay += 1;
    else if (hours < 24 * 7) buckets.withinWeek += 1;
    else buckets.longer += 1;
  }

  return [
    { label: "Within 1 hour", count: buckets.withinHour },
    { label: "Same day", count: buckets.sameDay },
    { label: "Within a week", count: buckets.withinWeek },
    { label: "Longer than a week", count: buckets.longer },
    { label: "Never contacted", count: buckets.never },
  ];
}

export type SourceTrendRow = { source: string; monthlyCounts: number[]; total: number };
export type SourceTrendData = { monthLabels: string[]; rows: SourceTrendRow[] };

// Filtered on lead_date, same reasoning as getNewLeadsReport - a backfilled
// CSV contact should show up in the month it actually came in, not the
// month it happened to be imported.
export async function getSourceTrend(): Promise<SourceTrendData> {
  const supabase = await createClient();
  const months = lastNMonths(6);
  const { data: contacts } = await supabase
    .from("contacts")
    .select("lead_source, lead_date")
    .eq("archived", false)
    .gte("lead_date", months[0].start.toISOString());

  const countsBySource = new Map<string, number[]>();
  for (const c of contacts ?? []) {
    const source = c.lead_source?.trim() || "Unknown";
    const t = new Date(c.lead_date).getTime();
    const idx = months.findIndex((m) => t >= m.start.getTime() && t < m.end.getTime());
    if (idx === -1) continue;
    if (!countsBySource.has(source)) countsBySource.set(source, new Array(months.length).fill(0));
    countsBySource.get(source)![idx] += 1;
  }

  const rows = [...countsBySource.entries()]
    .map(([source, monthlyCounts]) => ({ source, monthlyCounts, total: monthlyCounts.reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.total - a.total);

  return { monthLabels: months.map((m) => m.label), rows };
}
