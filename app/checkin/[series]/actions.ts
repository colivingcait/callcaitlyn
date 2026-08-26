"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { processCheckIn, type CheckInInput } from "@/lib/checkin/process-checkin";
import type { EventSeriesKey } from "@/lib/crm/nearest-event";

const OWNER_ID = process.env.CRM_OWNER_USER_ID;

// Public, unauthenticated by design - this is what the printed QR code
// points attendees' own phones at. There's no login flow for a walk-in
// scanning a code at the door, so every action here goes straight through
// the admin client scoped to the single owner account (same pattern as
// the webhook routes), not a user session.
function parseSeries(series: string): EventSeriesKey | null {
  return series === "house_hacking" || series === "womens_rei" ? series : null;
}

export type ContactMatch = { id: string; firstName: string; lastName: string; email: string | null; phone: string | null };

// Searches the whole contact database by name (not just this event's
// registrants) - a deliberate choice: catches an existing contact from a
// past meetup attending a different series, at the cost of a public page
// being able to look up any contact by name if the link ever leaks beyond
// the room. Capped at 5 results and requires both names to at least
// partially match, so it's a lookup, not a browsable directory.
export async function searchContacts(firstName: string, lastName: string): Promise<ContactMatch[]> {
  if (!OWNER_ID) return [];
  const first = firstName.trim();
  const last = lastName.trim();
  if (!first || !last) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("contacts")
    .select("id, first_name, last_name, email, phone")
    .eq("owner_id", OWNER_ID)
    .eq("archived", false)
    .ilike("first_name", `${first}%`)
    .ilike("last_name", `${last}%`)
    .limit(5);

  return (data ?? []).map((c) => ({ id: c.id, firstName: c.first_name, lastName: c.last_name, email: c.email, phone: c.phone }));
}

export async function submitCheckIn(
  series: string,
  input: CheckInInput,
): Promise<{ ok: true; alreadyCheckedIn: boolean } | { ok: false; error: string }> {
  const seriesKey = parseSeries(series);
  if (!seriesKey) return { ok: false, error: "Unknown check-in link" };
  if (!OWNER_ID) return { ok: false, error: "Server not configured" };

  if (!input.contactId) {
    if (!input.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
      return { ok: false, error: "Enter a valid email address" };
    }
    if (!input.phone.trim()) return { ok: false, error: "Enter a phone number" };
  }

  const admin = createAdminClient();
  const result = await processCheckIn(admin, OWNER_ID, seriesKey, input);
  if (!result.ok) return result;
  return { ok: true, alreadyCheckedIn: result.alreadyCheckedIn };
}
