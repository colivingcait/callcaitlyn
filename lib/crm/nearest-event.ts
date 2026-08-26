import type { SupabaseClient } from "@supabase/supabase-js";

export type EventSeriesKey = "house_hacking" | "womens_rei";

type EventBucket = { eventId: string; eventName: string | null; eventStart: string | null; lastRegisteredAt: string };

// Which specific Eventbrite occurrence in a series a check-in happening
// "now" (asOf) belongs to. Prefers the occurrence whose real scheduled
// date (event_start) is closest to asOf - that's what "which night is
// this" actually means. Only falls back to "most recently opened for
// registration" for events logged before event_start was captured: that
// old heuristic silently breaks the moment two occurrences' registration
// windows overlap (e.g. next month's event opens for signups before this
// month's has even happened), which reliably happens since Caitlyn
// publishes the next meetup ahead of time - it would then attribute a
// check-in at the earlier, currently-happening event to the later one
// instead, because the later one's most recent *registration* is more
// recent even though its *event date* is further away. Shared by the
// Jotform check-in linker and the QR check-in flow (called with "now"
// there) so both agree on which specific event a check-in belongs to.
export async function resolveNearestEbEvent(
  admin: SupabaseClient,
  ownerId: string,
  series: EventSeriesKey,
  asOf: string,
): Promise<{ eventId: string | null; eventName: string | null }> {
  const { data } = await admin
    .from("activities")
    .select("metadata, occurred_at")
    .eq("owner_id", ownerId)
    .eq("source", "eventbrite")
    .eq("metadata->>eventbrite_account", series);

  const byEvent = new Map<string, EventBucket>();
  for (const row of data ?? []) {
    const metadata = row.metadata as Record<string, unknown> | null;
    const eventId = typeof metadata?.event_id === "string" ? metadata.event_id : null;
    if (!eventId) continue;
    const eventStart = typeof metadata?.event_start === "string" ? metadata.event_start : null;
    const eventName = typeof metadata?.event_name === "string" ? metadata.event_name : null;
    const occurredAt = row.occurred_at as string;

    const existing = byEvent.get(eventId);
    if (!existing) {
      byEvent.set(eventId, { eventId, eventName, eventStart, lastRegisteredAt: occurredAt });
    } else {
      existing.eventStart = existing.eventStart ?? eventStart;
      existing.eventName = existing.eventName ?? eventName;
      if (occurredAt > existing.lastRegisteredAt) existing.lastRegisteredAt = occurredAt;
    }
  }

  const asOfTime = new Date(asOf).getTime();
  const withStart = [...byEvent.values()].filter((b) => b.eventStart);
  if (withStart.length > 0) {
    withStart.sort((a, b) => Math.abs(new Date(a.eventStart!).getTime() - asOfTime) - Math.abs(new Date(b.eventStart!).getTime() - asOfTime));
    const best = withStart[0];
    return { eventId: best.eventId, eventName: best.eventName };
  }

  const eligible = [...byEvent.values()].filter((b) => b.lastRegisteredAt <= asOf);
  if (eligible.length === 0) return { eventId: null, eventName: null };
  eligible.sort((a, b) => b.lastRegisteredAt.localeCompare(a.lastRegisteredAt));
  return { eventId: eligible[0].eventId, eventName: eligible[0].eventName };
}
