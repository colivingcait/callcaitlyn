import { createClient } from "@/lib/supabase/server";
import type { ContactWithRelations } from "@/types/database";

export type DialerContact = Pick<
  ContactWithRelations,
  | "id"
  | "first_name"
  | "last_name"
  | "phone"
  | "lead_source"
  | "contact_type"
  | "stage_id"
  | "pipeline_stages"
  | "contact_tags"
  | "created_at"
> & { lastCallAt: string | null; callCount: number };

// The dialer's queue: everyone with a phone number, not-yet-contacted
// leads first (newest registrations on top, for speed-to-lead), already-
// contacted people below that (least-recently-called first, so anyone
// going stale on follow-up naturally rises back toward the top of that
// group). Nobody drops off the list just because they've been called -
// see the original ask: a no-answer/voicemail moves to the bottom, it
// doesn't disappear.
export async function listDialerContacts(): Promise<DialerContact[]> {
  const supabase = await createClient();
  const { data: contacts } = await supabase
    .from("contacts")
    .select(
      "id, first_name, last_name, phone, lead_source, contact_type, stage_id, created_at, pipeline_stages(*), contact_tags(tags(*))",
    )
    .eq("archived", false)
    .not("phone", "is", null)
    .order("created_at", { ascending: false });

  const list = (contacts ?? []) as unknown as DialerContact[];
  if (list.length === 0) return [];

  const ids = list.map((c) => c.id);
  const { data: calls } = await supabase
    .from("activities")
    .select("contact_id, occurred_at")
    .eq("type", "call")
    .in("contact_id", ids)
    .order("occurred_at", { ascending: false });

  const lastCallByContact = new Map<string, string>();
  const callCountByContact = new Map<string, number>();
  for (const row of calls ?? []) {
    callCountByContact.set(row.contact_id, (callCountByContact.get(row.contact_id) ?? 0) + 1);
    if (!lastCallByContact.has(row.contact_id)) lastCallByContact.set(row.contact_id, row.occurred_at);
  }

  const withCalls: DialerContact[] = list.map((c) => ({
    ...c,
    lastCallAt: lastCallByContact.get(c.id) ?? null,
    callCount: callCountByContact.get(c.id) ?? 0,
  }));

  const notContacted = withCalls
    .filter((c) => !c.lastCallAt)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const contacted = withCalls
    .filter((c) => c.lastCallAt)
    .sort((a, b) => new Date(a.lastCallAt as string).getTime() - new Date(b.lastCallAt as string).getTime());

  return [...notContacted, ...contacted];
}
