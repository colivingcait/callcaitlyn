import { createClient } from "@/lib/supabase/server";
import { computeLikelihood } from "@/lib/crm/likelihood";
import { getDuplicateRiskPairs } from "@/lib/data/reports";
import type { ContactQueue } from "@/lib/crm/contact-queues";
import type { ContactWithRelations, PipelineStage } from "@/types/database";

const QUIET_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;
// Registering for an event and the event itself aren't the same moment,
// and we don't reliably know the event's date (only when they registered) -
// this buffer avoids flagging someone as a "no-show" the day after they
// signed up, before the event they registered for has even happened yet.
const NO_SHOW_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

type ActivityAgg = {
  lastOutreachAt: number | null;
  lastCallAt: number | null;
  lastEventbriteAt: number | null;
  jotformCheckinCount: number;
};

async function fetchActivityAggregates(): Promise<Map<string, ActivityAgg>> {
  const supabase = await createClient();
  const { data } = await supabase.from("activities").select("contact_id, type, source, occurred_at");

  const map = new Map<string, ActivityAgg>();
  for (const row of data ?? []) {
    const entry = map.get(row.contact_id as string) ?? {
      lastOutreachAt: null,
      lastCallAt: null,
      lastEventbriteAt: null,
      jotformCheckinCount: 0,
    };
    const t = new Date(row.occurred_at as string).getTime();

    if (row.type === "call" || row.type === "text" || row.type === "email") {
      if (entry.lastOutreachAt === null || t > entry.lastOutreachAt) entry.lastOutreachAt = t;
    }
    if (row.type === "call" && (entry.lastCallAt === null || t > entry.lastCallAt)) entry.lastCallAt = t;
    if (row.source === "eventbrite" && (entry.lastEventbriteAt === null || t > entry.lastEventbriteAt)) entry.lastEventbriteAt = t;
    if (row.source === "checkin" || row.source === "jotform") entry.jotformCheckinCount++;

    map.set(row.contact_id as string, entry);
  }
  return map;
}

export async function filterByQueue(
  contacts: ContactWithRelations[],
  queue: ContactQueue,
  stages: PipelineStage[],
): Promise<ContactWithRelations[]> {
  const now = Date.now();

  if (queue === "ai_flagged") {
    const supabase = await createClient();
    const { data } = await supabase.from("ai_insights").select("contact_id").eq("dismissed", false);
    const flagged = new Set((data ?? []).map((r) => r.contact_id as string));
    return contacts.filter((c) => flagged.has(c.id));
  }

  if (queue === "duplicate_risk") {
    const pairs = await getDuplicateRiskPairs();
    const flagged = new Set(pairs.flatMap((p) => [p.aId, p.bId]));
    return contacts.filter((c) => flagged.has(c.id));
  }

  const agg = await fetchActivityAggregates();

  if (queue === "no_followup_after_registration") {
    return contacts.filter((c) => {
      const a = agg.get(c.id);
      if (!a?.lastEventbriteAt) return false;
      return a.lastOutreachAt === null || a.lastOutreachAt < a.lastEventbriteAt;
    });
  }

  if (queue === "no_show") {
    return contacts.filter((c) => {
      const a = agg.get(c.id);
      if (!a?.lastEventbriteAt || c.last_event_at) return false;
      return a.lastEventbriteAt < now - NO_SHOW_GRACE_MS;
    });
  }

  if (queue === "attended_gone_quiet") {
    return contacts.filter((c) => {
      if (!c.last_event_at) return false;
      const lastOutreachAt = agg.get(c.id)?.lastOutreachAt ?? null;
      const lastAttendedAt = new Date(c.last_event_at).getTime();
      return lastOutreachAt === null || lastOutreachAt < lastAttendedAt;
    });
  }

  if (queue === "cold_from_hot") {
    return contacts.filter((c) => {
      if (computeLikelihood(c, stages) !== "high") return false;
      // Only flag leads old enough to plausibly have gone cold - otherwise
      // a brand-new hot lead with no activity yet (normal, hasn't been
      // called back yet) would get miscategorized as "went cold".
      if (new Date(c.lead_date).getTime() > now - QUIET_THRESHOLD_MS) return false;
      const lastOutreachAt = agg.get(c.id)?.lastOutreachAt ?? null;
      return lastOutreachAt === null || lastOutreachAt < now - QUIET_THRESHOLD_MS;
    });
  }

  if (queue === "never_called") {
    return contacts.filter((c) => agg.get(c.id)?.lastCallAt == null);
  }

  if (queue === "repeat_attendees") {
    return contacts.filter((c) => (agg.get(c.id)?.jotformCheckinCount ?? 0) >= 2);
  }

  return contacts;
}
