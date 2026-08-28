import { createClient } from "@/lib/supabase/server";
import { listContacts, listStages } from "@/lib/data/contacts";
import { filterByQueue } from "@/lib/crm/contact-queue-filter";
import { getDuplicateRiskPairs } from "@/lib/data/reports";
import { computeDeals } from "@/lib/crm/commission";
import { getWarmRanking } from "@/lib/data/warm";
import { isDismissedWithin } from "@/lib/crm/dismissed-insights";
import { fullName } from "@/lib/utils";
import type { Deal } from "@/types/database";

const DISMISS_WINDOW_DAYS = 30;
const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;

export type LeaseRow = { contactId: string; name: string; phone: string | null; month: string; leaseEndsAt: string; dismissKey: string };
export type SimplePerson = { contactId: string; name: string; phone: string | null };
export type ClosedRow = { contactId: string; name: string; phone: string | null; closedAt: string; yearsAgo: number };

export type InsightsData = {
  leases: LeaseRow[];
  warmCount: number;
  coldHot: SimplePerson[];
  regularsNeverCalled: SimplePerson[];
  pastClientsTwoYears: ClosedRow[];
  noPhoneCount: number;
  duplicatePairs: { aId: string; aName: string; bId: string; bName: string }[];
};

export async function getInsightsData(): Promise<InsightsData> {
  const supabase = await createClient();

  const [contacts, stages, duplicatePairs, warmRanking, { data: dismissals }] = await Promise.all([
    listContacts({}),
    listStages(),
    getDuplicateRiskPairs(),
    getWarmRanking(),
    supabase.from("dismissed_insights").select("insight_key, contact_id, dismissed_at"),
  ]);

  const dismissedByKey = new Map<string, string>();
  const cardLevelDismissed = new Set<string>();
  for (const d of dismissals ?? []) {
    if (d.contact_id) dismissedByKey.set(`${d.insight_key}:${d.contact_id}`, d.dismissed_at);
    else if (isDismissedWithin(d.dismissed_at, DISMISS_WINDOW_DAYS)) cardLevelDismissed.add(d.insight_key);
  }

  const known = contacts.filter((c) => !c.known_personally);

  // --- Leases ending within 90 days ---
  const in90Days = Date.now() + 90 * 24 * 60 * 60 * 1000;
  const leases: LeaseRow[] = known
    .filter((c) => c.lease_ends_at && new Date(c.lease_ends_at).getTime() <= in90Days && new Date(c.lease_ends_at).getTime() >= Date.now())
    .map((c) => {
      const key = `lease_reminder:${c.lease_ends_at}`;
      return {
        contactId: c.id,
        name: fullName(c),
        phone: c.phone,
        month: new Date(c.lease_ends_at!).toLocaleDateString("en-US", { month: "long" }),
        leaseEndsAt: c.lease_ends_at!,
        dismissKey: key,
      };
    })
    .filter((row) => !isDismissedWithin(dismissedByKey.get(`${row.dismissKey}:${row.contactId}`), DISMISS_WINDOW_DAYS))
    .sort((a, b) => a.leaseEndsAt.localeCompare(b.leaseEndsAt));

  // --- Paying attention (count only here - the ranked list lives on /insights/warm) ---
  const warmCount = warmRanking.filter((w) => w.tier === "very_warm" || w.tier === "warm").length;

  // --- Hot/Ready gone quiet 30+ days ---
  const coldHotMatches = cardLevelDismissed.has("cold_from_hot") ? [] : await filterByQueue(known, "cold_from_hot", stages);
  const coldHot: SimplePerson[] = coldHotMatches.map((c) => ({ contactId: c.id, name: fullName(c), phone: c.phone }));

  // --- Regulars (2+ meetups) never called ---
  let regularsNeverCalled: SimplePerson[] = [];
  if (!cardLevelDismissed.has("regulars_never_called")) {
    const repeatAttendees = await filterByQueue(known, "repeat_attendees", stages);
    const neverCalledIds = new Set((await filterByQueue(known, "never_called", stages)).map((c) => c.id));
    regularsNeverCalled = repeatAttendees.filter((c) => neverCalledIds.has(c.id)).map((c) => ({ contactId: c.id, name: fullName(c), phone: c.phone }));
  }

  // --- Past clients, 2+ years since closing ---
  let pastClientsTwoYears: ClosedRow[] = [];
  if (!cardLevelDismissed.has("past_clients_two_years")) {
    const { data: won } = await supabase.from("deals").select("*").eq("status", "won");
    const computedWon = computeDeals((won ?? []) as Deal[]);
    const latestCloseByContact = new Map<string, string>();
    for (const d of computedWon) {
      if (!d.contact_id) continue;
      const cur = latestCloseByContact.get(d.contact_id);
      if (!cur || d.closed_at > cur) latestCloseByContact.set(d.contact_id, d.closed_at);
    }
    const knownById = new Map(known.map((c) => [c.id, c]));
    for (const [contactId, closedAt] of latestCloseByContact) {
      const contact = knownById.get(contactId);
      if (!contact) continue;
      const ageMs = Date.now() - new Date(closedAt).getTime();
      if (ageMs < TWO_YEARS_MS) continue;
      pastClientsTwoYears.push({
        contactId,
        name: fullName(contact),
        phone: contact.phone,
        closedAt,
        yearsAgo: Math.floor(ageMs / (365 * 24 * 60 * 60 * 1000)),
      });
    }
    pastClientsTwoYears.sort((a, b) => b.yearsAgo - a.yearsAgo);
  }

  // --- Data problems: no phone, duplicates ---
  const noPhone = cardLevelDismissed.has("data_problems") ? [] : known.filter((c) => !c.phone);

  return {
    leases,
    warmCount,
    coldHot,
    regularsNeverCalled,
    pastClientsTwoYears,
    noPhoneCount: noPhone.length,
    duplicatePairs: cardLevelDismissed.has("data_problems") ? [] : duplicatePairs,
  };
}
