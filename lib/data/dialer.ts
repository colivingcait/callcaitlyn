import { createClient } from "@/lib/supabase/server";
import type { Contact } from "@/types/database";

export type DialerMode = "new-registration" | "event-followup";

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
> & {
  // New-registrations queue only: true if this contact has never
  // registered before (this is their only Eventbrite/Calendly activity
  // on file). Not used by the event-followup queue.
  isNew?: boolean;
  // New-registrations queue only: the specific event name from their
  // MOST RECENT registration's activity record, not the contact's static
  // lead_source - lead_source only gets set once, at first creation, so a
  // returning registrant's card would otherwise show whatever their very
  // first source was instead of what they just signed up for. Falls back
  // to lead_source when the latest registration has no event name on it
  // (e.g. a Calendly booking).
  registrationLabel?: string | null;
  // New-registrations queue only: "womens_rei" | "house_hacking" | null,
  // from the same registration's metadata.eventbrite_account (set at
  // ingestion by which Eventbrite account the webhook/backfill fired
  // under - see lib/eventbrite/process-order.ts). This is the reliable
  // signal for which meetup a registration belongs to; the event NAME
  // text can't be trusted for that (an event like "Inside the Making of a
  // 250-Home Neighborhood" doesn't contain "women" even when it's a
  // Women's REI event) - see lib/crm/dialer-text-templates.ts.
  registrationAccount?: string | null;
};

// "New Registrations": anyone with an untouched Eventbrite or Calendly
// registration - deliberately NOT scoped to pipeline stage, since stage
// reflects sales-readiness (a self-reported "I'm ready to buy" answer can
// jump a brand-new contact straight to Hot/Ready) while this queue is
// about outreach: has this specific registration been touched yet. A
// contact re-registering later re-arms the queue even if they were
// touched before, since "contacted" here means "since their most recent
// registration," not "ever, once, for life" - that's what makes repeat
// registrants keep showing up as a re-engagement opportunity instead of
// disappearing after the first call. Each row is flagged isNew/returning
// so the two don't look identical, but a returning registrant isn't
// treated as lower priority - it's still a live touch, just a different
// kind (a chance to reconnect, not a first contact).
export async function listNewRegistrationsQueue(): Promise<{ contacts: DialerContact[]; error: string | null }> {
  const supabase = await createClient();

  const { data: candidates, error: candidatesError } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, phone, lead_source, last_event_name, last_event_at, created_at, dialer_contacted_at, dialer_snoozed_at, stage_id")
    .eq("archived", false)
    .not("phone", "is", null);

  // A query error here (e.g. a column the dialer depends on doesn't exist
  // yet because a migration hasn't been run) must never silently render as
  // "nobody left to call" - that's indistinguishable from a genuinely
  // empty, healthy queue. Surface it instead.
  if (candidatesError) return { contacts: [], error: candidatesError.message };
  if (!candidates || candidates.length === 0) return { contacts: [], error: null };

  const { data: registrations, error: regError } = await supabase
    .from("activities")
    .select("contact_id, occurred_at, metadata")
    .in("source", ["eventbrite", "calendly"])
    .in(
      "contact_id",
      candidates.map((c) => c.id),
    )
    .order("occurred_at", { ascending: false });
  if (regError) return { contacts: [], error: regError.message };

  const latestRegByContact = new Map<string, string>();
  const latestEventNameByContact = new Map<string, string | null>();
  const latestEventAccountByContact = new Map<string, string | null>();
  const registrationCountByContact = new Map<string, number>();
  for (const row of registrations ?? []) {
    registrationCountByContact.set(row.contact_id, (registrationCountByContact.get(row.contact_id) ?? 0) + 1);
    // First hit per contact wins the "latest" slot since the query is
    // ordered newest-first.
    if (!latestRegByContact.has(row.contact_id)) {
      latestRegByContact.set(row.contact_id, row.occurred_at);
      const metadata = row.metadata as Record<string, unknown> | null;
      latestEventNameByContact.set(row.contact_id, typeof metadata?.event_name === "string" ? metadata.event_name : null);
      latestEventAccountByContact.set(row.contact_id, typeof metadata?.eventbrite_account === "string" ? metadata.eventbrite_account : null);
    }
  }

  const eligible = candidates
    .filter((c) => {
      const latestReg = latestRegByContact.get(c.id);
      if (!latestReg) return false;
      // "contacted" only counts if it happened at or after their most
      // recent registration - an old touch from before they registered
      // again doesn't cover the new registration.
      if (c.dialer_contacted_at && new Date(c.dialer_contacted_at) >= new Date(latestReg)) return false;
      return true;
    })
    .map(
      (c) =>
        ({
          ...c,
          isNew: (registrationCountByContact.get(c.id) ?? 0) <= 1,
          registrationLabel: latestEventNameByContact.get(c.id) ?? c.lead_source,
          registrationAccount: latestEventAccountByContact.get(c.id) ?? null,
        }) as DialerContact,
    );

  const sorted = eligible.sort((a, b) => {
    const latestA = new Date(latestRegByContact.get(a.id) as string).getTime();
    const latestB = new Date(latestRegByContact.get(b.id) as string).getTime();
    // A snooze only sticks if nothing's happened since - a fresh
    // registration after a "no answer" un-snoozes them back to the top
    // instead of leaving them stuck at the bottom forever.
    const aSnoozed = !!a.dialer_snoozed_at && new Date(a.dialer_snoozed_at).getTime() >= latestA;
    const bSnoozed = !!b.dialer_snoozed_at && new Date(b.dialer_snoozed_at).getTime() >= latestB;
    if (aSnoozed !== bSnoozed) return aSnoozed ? 1 : -1;
    if (aSnoozed && bSnoozed) return new Date(a.dialer_snoozed_at as string).getTime() - new Date(b.dialer_snoozed_at as string).getTime();
    return latestB - latestA;
  });

  return { contacts: sorted, error: null };
}

// A second, independent queue: people who actually attended (last_event_at
// is only set by a real Jotform check-in, distinct from just registering)
// and haven't had a follow-up call logged since. Deliberately separate
// tracking from the New Registrations queue above - someone can and
// should appear here even after already being called at registration,
// since it's a genuinely different touchpoint.
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
