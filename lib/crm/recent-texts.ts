import type { SupabaseClient } from "@supabase/supabase-js";

export type TextThreadMessage = { body: string; direction: "inbound" | "outbound"; occurredAt: string };

export const RECENT_TEXTS_WINDOW_DAYS = 30;
export const RECENT_TEXTS_MAX_PER_CONTACT = 8;

// A short recent thread (either direction) per contact - used everywhere
// she's about to text someone and wants to see what's already been said
// before deciding what (or whether) to send: the bulk text blast's
// audience preview, and each of the Dialer's three queues. Windowed to 30
// days (comfortably covers "the last week or so" plus a straggler further
// back) and capped per contact so a chatty thread doesn't blow up the
// review list. Real texts only (source: quo, the only place a text's
// body/direction actually get logged) - a manual note or other activity
// type wouldn't answer "did they already reply."
export async function fetchRecentTextsByContact(admin: SupabaseClient, ownerId: string, contactIds: string[]): Promise<Map<string, TextThreadMessage[]>> {
  if (contactIds.length === 0) return new Map();

  const since = new Date(Date.now() - RECENT_TEXTS_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await admin
    .from("activities")
    .select("contact_id, body, direction, occurred_at")
    .eq("owner_id", ownerId)
    .eq("source", "quo")
    .eq("type", "text")
    .in("contact_id", contactIds)
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: false });

  const byContact = new Map<string, TextThreadMessage[]>();
  for (const row of data ?? []) {
    if (!row.body) continue;
    const list = byContact.get(row.contact_id) ?? [];
    if (list.length < RECENT_TEXTS_MAX_PER_CONTACT) {
      list.push({ body: row.body, direction: row.direction as "inbound" | "outbound", occurredAt: row.occurred_at });
      byContact.set(row.contact_id, list);
    }
  }
  // Each list was built newest-first (to cap correctly) - reverse to
  // chronological order for display.
  for (const [contactId, list] of byContact) byContact.set(contactId, list.slice().reverse());
  return byContact;
}
