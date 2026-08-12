import { createClient } from "@/lib/supabase/server";
import type { Period } from "@/lib/data/metrics";

const PERIOD_DAYS: Record<Period, number> = { week: 7, month: 30 };

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
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
