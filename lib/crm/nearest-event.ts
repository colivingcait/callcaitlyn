import type { SupabaseClient } from "@supabase/supabase-js";

export type EventSeriesKey = "house_hacking" | "womens_rei";

// The most recently-opened-for-registration Eventbrite event in a series,
// as of a given timestamp - a solid proxy for "the one happening right
// now" since a new event_id only starts collecting fresh registrations
// once the next occurrence goes up. Shared by the Jotform check-in linker
// and the QR check-in flow (called with "now" there) so both agree on
// which specific event a check-in belongs to.
export async function resolveNearestEbEvent(
  admin: SupabaseClient,
  ownerId: string,
  series: EventSeriesKey,
  asOf: string,
): Promise<{ eventId: string | null; eventName: string | null }> {
  const { data } = await admin
    .from("activities")
    .select("metadata")
    .eq("owner_id", ownerId)
    .eq("source", "eventbrite")
    .eq("metadata->>eventbrite_account", series)
    .lte("occurred_at", asOf)
    .order("occurred_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const metadata = data?.metadata as Record<string, unknown> | undefined;
  const eventId = typeof metadata?.event_id === "string" ? metadata.event_id : null;
  const eventName = typeof metadata?.event_name === "string" ? metadata.event_name : null;
  return { eventId, eventName };
}
