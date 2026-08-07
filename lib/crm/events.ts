import type { SupabaseClient } from "@supabase/supabase-js";

// Shared by Eventbrite and Jotform: keeps "last event attended" pointed at
// whichever event is most recent, regardless of which integration logs it
// or what order deliveries arrive in.
export async function recordEventAttendance(
  admin: SupabaseClient,
  contactId: string,
  eventName: string,
  eventAt: string,
) {
  const { data: contact } = await admin.from("contacts").select("last_event_at").eq("id", contactId).maybeSingle();
  const current = contact?.last_event_at ? new Date(contact.last_event_at) : null;
  const incoming = new Date(eventAt);

  if (!current || incoming >= current) {
    await admin.from("contacts").update({ last_event_name: eventName, last_event_at: eventAt }).eq("id", contactId);
  }
}
