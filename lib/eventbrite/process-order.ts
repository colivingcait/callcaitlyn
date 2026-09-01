import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchEventDetails } from "./client";
import { parseEventbriteAttendees } from "./parse-event";
import { findOrCreateContact, addTagByName } from "@/lib/crm/find-or-create-contact";
import { upsertActivity } from "@/lib/crm/activities";
import { applyJourneyStageAnswer } from "@/lib/crm/journey-stage";
import { notifyNewLead } from "@/lib/push/send-push";

// Which Eventbrite *account* processed an order isn't a reliable signal for
// which meetup series it belongs to - an event can be created under either
// account regardless of its actual topic/host (confirmed by a real case: a
// Women's REI meetup about house hacking got created under the House
// Hacking account and ingested as house_hacking for 11 registrations
// before anyone noticed). The real, unambiguous identity is the specific
// Eventbrite event_id. So: the first registration seen for a given
// event_id "locks in" its series from the account that processed it (best
// guess available at the time); every later registration for that same
// event_id reuses whatever's already on file instead of re-deriving it -
// keeping a single event internally consistent, and letting a one-time
// manual correction (fixing the metadata on existing rows) self-heal every
// future registration for that event too.
async function resolveEventSeries(
  admin: SupabaseClient,
  ownerId: string,
  eventId: string | null,
  fallbackIsWomensRei: boolean,
): Promise<boolean> {
  if (!eventId) return fallbackIsWomensRei;

  const { data: existing } = await admin
    .from("activities")
    .select("metadata")
    .eq("owner_id", ownerId)
    .eq("source", "eventbrite")
    .eq("metadata->>event_id", eventId)
    .limit(1)
    .maybeSingle();

  const existingAccount = (existing?.metadata as Record<string, unknown> | undefined)?.eventbrite_account;
  if (typeof existingAccount === "string") return existingAccount === "womens_rei";

  return fallbackIsWomensRei;
}

// Shared between the live webhook (one order at a time, notifies) and the
// manual backfill button (many orders at once, never notifies - see
// notifyNewLead's own comment on why bulk syncs must stay silent) so both
// paths create/tag/log contacts identically instead of drifting apart.
export async function processEventbriteOrder(
  admin: SupabaseClient,
  ownerId: string,
  order: Record<string, unknown>,
  accountIsWomensRei: boolean,
  apiToken: string | undefined,
  opts: { notify: boolean },
): Promise<number> {
  const eventId = typeof order.event_id === "string" ? order.event_id : null;
  const eventDetails = eventId ? await fetchEventDetails(eventId, apiToken) : { name: null, startLocal: null };
  const eventName = eventDetails.name;
  const isWomensRei = await resolveEventSeries(admin, ownerId, eventId, accountIsWomensRei);
  const attendees = parseEventbriteAttendees(order);

  let processed = 0;

  for (const attendee of attendees) {
    if (!attendee.email) continue;

    const contact = await findOrCreateContact(admin, ownerId, {
      email: attendee.email,
      phone: attendee.phone,
      firstName: attendee.firstName,
      lastName: attendee.lastName,
      leadSource: eventName ?? "Eventbrite",
      contactType: "attendee",
    });
    if (!contact) continue;

    await addTagByName(admin, ownerId, contact.id, "Meetup");
    if (isWomensRei) await addTagByName(admin, ownerId, contact.id, "Women's REI");
    await applyJourneyStageAnswer(admin, ownerId, contact.id, attendee.journeyStage, contact.wasCreated);

    const occurredAt = typeof order.created === "string" ? order.created : new Date().toISOString();
    const bodyParts = [`Registered${eventName ? ` for ${eventName}` : " for an event"} via Eventbrite`];
    if (attendee.journeyStage) bodyParts.push(`House hacking journey: ${attendee.journeyStage}`);

    const activity = await upsertActivity(admin, ownerId, contact.id, "eventbrite", "eventbrite_attendee_id", attendee.attendeeId, {
      type: "meeting",
      direction: "none",
      occurred_at: occurredAt,
      body: bodyParts.join(" — "),
      metadata: {
        eventbrite_attendee_id: attendee.attendeeId,
        eventbrite_order_id: order.id,
        eventbrite_account: isWomensRei ? "womens_rei" : "house_hacking",
        event_id: eventId,
        event_name: eventName,
        event_start: eventDetails.startLocal,
        journey_stage: attendee.journeyStage,
        raw: order,
      },
    });

    // Only notify the first time this exact registration is processed -
    // Eventbrite redelivers a webhook it considers failed/timed out on its
    // own retry schedule, and without this check each redelivery fired a
    // fresh "registered" push for the same signup, hours apart, forever.
    // wasCreated is false on every redelivery since upsertActivity finds
    // the row it already wrote the first time.
    if (opts.notify && activity.wasCreated) {
      const name = [attendee.firstName, attendee.lastName].filter(Boolean).join(" ") || attendee.email;
      await notifyNewLead(admin, ownerId, {
        title: contact.wasCreated ? "New event sign-up" : "Event sign-up",
        body: `${name} registered${eventName ? ` for ${eventName}` : ""} via Eventbrite`,
        url: `/contacts/${contact.id}`,
      });
    }

    processed++;
  }

  return processed;
}
