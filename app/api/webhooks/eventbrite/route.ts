import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchOrderWithAttendees, fetchEventName } from "@/lib/eventbrite/client";
import { parseEventbriteAttendees } from "@/lib/eventbrite/parse-event";
import { findOrCreateContact, addTagByName } from "@/lib/crm/find-or-create-contact";
import { upsertActivity } from "@/lib/crm/activities";

const OWNER_ID = process.env.CRM_OWNER_USER_ID;

export async function POST(request: NextRequest) {
  // Eventbrite doesn't have a confirmed webhook-signing scheme, so instead
  // of guessing at one (like Quo/Calendly), this endpoint is protected by
  // a secret baked into the webhook URL itself when it's registered - see
  // README's Eventbrite section.
  const secret = request.nextUrl.searchParams.get("secret");
  if (!process.env.EVENTBRITE_WEBHOOK_SECRET || secret !== process.env.EVENTBRITE_WEBHOOK_SECRET) {
    console.error("Eventbrite webhook rejected: missing/incorrect secret");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!OWNER_ID) {
    console.error("Eventbrite webhook received but CRM_OWNER_USER_ID is not configured");
    return NextResponse.json({ error: "server not configured" }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const config = body.config as Record<string, unknown> | undefined;
  const action = typeof config?.action === "string" ? config.action : "unknown";
  const apiUrl = typeof body.api_url === "string" ? body.api_url : null;

  if (action !== "order.placed" || !apiUrl) {
    console.log("Unhandled or incomplete Eventbrite webhook", action, apiUrl);
    return NextResponse.json({ received: true });
  }

  const admin = createAdminClient();

  try {
    const order = await fetchOrderWithAttendees(apiUrl);
    if (!order) {
      return NextResponse.json({ received: true });
    }

    const eventId = typeof order.event_id === "string" ? order.event_id : null;
    const eventName = eventId ? await fetchEventName(eventId) : null;
    const attendees = parseEventbriteAttendees(order);

    for (const attendee of attendees) {
      if (!attendee.email) continue;

      const contact = await findOrCreateContact(admin, OWNER_ID, {
        email: attendee.email,
        phone: attendee.phone,
        firstName: attendee.firstName,
        lastName: attendee.lastName,
        leadSource: "Eventbrite",
      });
      if (!contact) continue;

      await addTagByName(admin, OWNER_ID, contact.id, "Meetup");

      await upsertActivity(admin, OWNER_ID, contact.id, "eventbrite", "eventbrite_attendee_id", attendee.attendeeId, {
        type: "meeting",
        direction: "none",
        occurred_at: typeof order.created === "string" ? order.created : new Date().toISOString(),
        body: `Registered${eventName ? ` for ${eventName}` : " for an event"} via Eventbrite`,
        metadata: {
          eventbrite_attendee_id: attendee.attendeeId,
          eventbrite_order_id: order.id,
          event_id: eventId,
          event_name: eventName,
          raw: order,
        },
      });
    }
  } catch (err) {
    console.error("Error processing Eventbrite webhook", action, err);
  }

  return NextResponse.json({ received: true });
}
