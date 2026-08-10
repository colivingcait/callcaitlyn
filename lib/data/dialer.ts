import { createClient } from "@/lib/supabase/server";
import type { Contact } from "@/types/database";

export type DialerContact = Pick<
  Contact,
  | "id"
  | "first_name"
  | "last_name"
  | "phone"
  | "lead_source"
  | "last_event_name"
  | "last_event_at"
  | "created_at"
  | "dialer_snoozed_at"
  | "stage_id"
>;

// "Not yet contacted" = no outbound call/text on file at all (whether
// logged by Quo or sent from the CRM) and never marked Connected from a
// prior dialer pass. Never-attempted contacts sort newest-first (speed to
// lead - call new registrants while the interest is fresh); anyone
// snoozed (rang out / voicemail / too short to count) drops below all of
// those, oldest-snoozed-first so retries cycle through in order, but
// stays on the list instead of disappearing.
export async function listDialerQueue(): Promise<{ contacts: DialerContact[]; error: string | null }> {
  const supabase = await createClient();

  const { data: candidates, error: candidatesError } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, phone, lead_source, last_event_name, last_event_at, created_at, dialer_snoozed_at, stage_id")
    .eq("archived", false)
    .is("dialer_contacted_at", null)
    .not("phone", "is", null);

  // A query error here (e.g. a column the dialer depends on doesn't exist
  // yet because a migration hasn't been run) must never silently render as
  // "nobody left to call" - that's indistinguishable from a genuinely
  // empty, healthy queue. Surface it instead.
  if (candidatesError) return { contacts: [], error: candidatesError.message };
  if (!candidates || candidates.length === 0) return { contacts: [], error: null };

  const { data: contacted, error: activitiesError } = await supabase
    .from("activities")
    .select("contact_id")
    .in("type", ["call", "text"])
    .eq("direction", "outbound")
    .in(
      "contact_id",
      candidates.map((c) => c.id),
    );
  if (activitiesError) return { contacts: [], error: activitiesError.message };

  const alreadyContacted = new Set((contacted ?? []).map((a) => a.contact_id));
  const queue = candidates.filter((c) => !alreadyContacted.has(c.id)) as DialerContact[];

  const sorted = queue.sort((a, b) => {
    const aSnoozed = !!a.dialer_snoozed_at;
    const bSnoozed = !!b.dialer_snoozed_at;
    if (aSnoozed !== bSnoozed) return aSnoozed ? 1 : -1;
    if (aSnoozed && bSnoozed) return new Date(a.dialer_snoozed_at!).getTime() - new Date(b.dialer_snoozed_at!).getTime();
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return { contacts: sorted, error: null };
}
