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
export async function listDialerQueue(): Promise<DialerContact[]> {
  const supabase = await createClient();

  const { data: candidates } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, phone, lead_source, last_event_name, last_event_at, created_at, dialer_snoozed_at, stage_id")
    .eq("archived", false)
    .is("dialer_contacted_at", null)
    .not("phone", "is", null);

  if (!candidates || candidates.length === 0) return [];

  const { data: contacted } = await supabase
    .from("activities")
    .select("contact_id")
    .in("type", ["call", "text"])
    .eq("direction", "outbound")
    .in(
      "contact_id",
      candidates.map((c) => c.id),
    );

  const alreadyContacted = new Set((contacted ?? []).map((a) => a.contact_id));
  const queue = candidates.filter((c) => !alreadyContacted.has(c.id)) as DialerContact[];

  return queue.sort((a, b) => {
    const aSnoozed = !!a.dialer_snoozed_at;
    const bSnoozed = !!b.dialer_snoozed_at;
    if (aSnoozed !== bSnoozed) return aSnoozed ? 1 : -1;
    if (aSnoozed && bSnoozed) return new Date(a.dialer_snoozed_at!).getTime() - new Date(b.dialer_snoozed_at!).getTime();
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
