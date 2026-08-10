import { createClient } from "@/lib/supabase/server";
import type { Contact } from "@/types/database";

export type DialerMode = "new-lead" | "event-followup";

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

// The dialer is deliberately narrow: it's a "call new people as they come
// in" tool, not a general call-list. Scoped to contacts still sitting in
// the New Lead stage (the pipeline's first stage, sort_order 0 - the same
// stage findOrCreateContact assigns on creation) with a phone number and
// no outbound call/text on file yet, who've never been marked Connected
// from a prior dialer pass. Moving a contact to any other stage removes
// them immediately, same as merging them into another contact (a
// duplicate's row - and its stage - stops existing once merged). Never-
// attempted contacts sort newest-first (speed to lead - call new
// registrants while the interest is fresh); anyone snoozed (rang out /
// voicemail / too short to count) drops below all of those, oldest-
// snoozed-first so retries cycle through in order, but stays on the list
// instead of disappearing.
export async function listDialerQueue(): Promise<{ contacts: DialerContact[]; error: string | null }> {
  const supabase = await createClient();

  const { data: firstStage, error: stageError } = await supabase
    .from("pipeline_stages")
    .select("id")
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (stageError) return { contacts: [], error: stageError.message };
  if (!firstStage) return { contacts: [], error: null };

  const { data: candidates, error: candidatesError } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, phone, lead_source, last_event_name, last_event_at, created_at, dialer_snoozed_at, stage_id")
    .eq("archived", false)
    .eq("stage_id", firstStage.id)
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

// A second, independent queue: people who actually attended (last_event_at
// is only set by a real Jotform check-in, distinct from just registering)
// and haven't had a follow-up call logged since. Deliberately separate
// tracking from the New Lead queue above - someone can and should appear
// here even after already being called at registration, since it's a
// genuinely different touchpoint.
export async function listEventFollowupQueue(): Promise<{ contacts: DialerContact[]; error: string | null }> {
  const supabase = await createClient();

  const { data: candidates, error } = await supabase
    .from("contacts")
    .select(
      "id, first_name, last_name, phone, lead_source, last_event_name, last_event_at, created_at, event_followup_snoozed_at, stage_id",
    )
    .eq("archived", false)
    .not("last_event_at", "is", null)
    .is("event_followup_contacted_at", null)
    .not("phone", "is", null);

  if (error) return { contacts: [], error: error.message };
  if (!candidates || candidates.length === 0) return { contacts: [], error: null };

  // Reuse the same DialerContact/DialerCard shape (dialer_snoozed_at) so
  // the UI components stay agnostic of which queue they're rendering.
  const mapped = candidates.map((c) => ({
    ...c,
    dialer_snoozed_at: c.event_followup_snoozed_at,
  })) as DialerContact[];

  const sorted = mapped.sort((a, b) => {
    const aSnoozed = !!a.dialer_snoozed_at;
    const bSnoozed = !!b.dialer_snoozed_at;
    if (aSnoozed !== bSnoozed) return aSnoozed ? 1 : -1;
    if (aSnoozed && bSnoozed) return new Date(a.dialer_snoozed_at!).getTime() - new Date(b.dialer_snoozed_at!).getTime();
    return new Date(b.last_event_at as string).getTime() - new Date(a.last_event_at as string).getTime();
  });

  return { contacts: sorted, error: null };
}
