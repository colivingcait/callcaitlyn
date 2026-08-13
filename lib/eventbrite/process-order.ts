import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchEventName } from "./client";
import { parseEventbriteAttendees } from "./parse-event";
import { findOrCreateContact, addTagByName } from "@/lib/crm/find-or-create-contact";
import { upsertActivity } from "@/lib/crm/activities";
import { applyJourneyStageAnswer } from "@/lib/crm/journey-stage";
import { notifyNewLead } from "@/lib/push/send-push";

// Shared between the live webhook (one order at a time, notifies) and the
// manual backfill button (many orders at once, never notifies - see
// notifyNewLead's own comment on why bulk syncs must stay silent) so both
// paths create/tag/log contacts identically instead of drifting apart.
export async function processEventbriteOrder(
  admin: SupabaseClient,
  ownerId: string,
  order: Record<string, unknown>,
  isWomensRei: boolean,
  apiToken: string | undefined,
  opts: { notify: boolean },
): Promise<number> {
  const eventId = typeof order.event_id === "string" ? order.event_id : null;
  const eventName = eventId ? await fetchEventName(eventId, apiToken) : null;
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

    if (opts.notify) {
      const name = [attendee.firstName, attendee.lastName].filter(Boolean).join(" ") || attendee.email;
      await notifyNewLead(admin, ownerId, {
        title: contact.wasCreated ? "New event sign-up" : "Event sign-up",
        body: `${name} registered${eventName ? ` for ${eventName}` : ""} via Eventbrite`,
        url: `/contacts/${contact.id}`,
      });
    }

    await addTagByName(admin, ownerId, contact.id, "Meetup");
    if (isWomensRei) await addTagByName(admin, ownerId, contact.id, "Women's REI");
    await applyJourneyStageAnswer(admin, ownerId, contact.id, attendee.journeyStage, contact.wasCreated);

    const occurredAt = typeof order.created === "string" ? order.created : new Date().toISOString();
    const bodyParts = [`Registered${eventName ? ` for ${eventName}` : " for an event"} via Eventbrite`];
    if (attendee.journeyStage) bodyParts.push(`House hacking journey: ${attendee.journeyStage}`);

    await upsertActivity(admin, ownerId, contact.id, "eventbrite", "eventbrite_attendee_id", attendee.attendeeId, {
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
        journey_stage: attendee.journeyStage,
        raw: order,
      },
    });

    processed++;
  }

  return processed;
}
