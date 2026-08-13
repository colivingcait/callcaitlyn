import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchOrderWithAttendees } from "@/lib/eventbrite/client";
import { processEventbriteOrder } from "@/lib/eventbrite/process-order";

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

  // Two separate Eventbrite accounts (House Hacking, Women's REI) share
  // this one endpoint - each account's own webhook subscription carries a
  // distinguishing ?account= param on its URL (see README), which picks
  // the right Private Token to fetch that account's order data with. No
  // param = the original/House Hacking account, so the existing webhook
  // URL she already has configured keeps working unchanged.
  const isWomensRei = request.nextUrl.searchParams.get("account") === "womens_rei";
  const apiToken = isWomensRei ? process.env.EVENTBRITE_WOMENS_REI_API_TOKEN : process.env.EVENTBRITE_API_TOKEN;

  const admin = createAdminClient();

  try {
    const order = await fetchOrderWithAttendees(apiUrl, apiToken);
    if (!order) {
      return NextResponse.json({ received: true });
    }

    // Every registration notifies, not just first-time contacts - a
    // returning registrant signing up for this month's event is just as
    // worth knowing about right away as a brand-new lead (she reads these
    // live and wants to reach out while it's fresh, not just at the "new
    // contact" moment).
    //
    // Deliberately does NOT call recordEventAttendance - registering for
    // an event isn't attending it, and last_event_at/last_event_name is
    // meant to reflect real attendance (it's what the post-event
    // follow-up dialer is scoped off of). The Jotform in-person check-in
    // is the only source of truth for actual attendance.
    await processEventbriteOrder(admin, OWNER_ID, order, isWomensRei, apiToken, { notify: true });
  } catch (err) {
    console.error("Error processing Eventbrite webhook", action, err);
  }

  return NextResponse.json({ received: true });
}
