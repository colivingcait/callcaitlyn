import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findOrCreateContact, addTagByName } from "@/lib/crm/find-or-create-contact";
import { upsertActivity } from "@/lib/crm/activities";
import { notifyNewLead } from "@/lib/push/send-push";

const OWNER_ID = process.env.CRM_OWNER_USER_ID;

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

// Blinq (Business tier) has no native webhook of its own - this is reached
// via Zapier's "Webhooks by Zapier" action on Blinq's "Contact Created"
// trigger, POSTing whatever JSON body she maps in Zapier's step (see
// README's Blinq section for the exact field names to map). Same
// secret-in-URL auth as Eventbrite/Jotform/Granola, since neither Blinq
// nor Zapier's generic webhook action offers request signing.
export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (!process.env.BLINQ_WEBHOOK_SECRET || secret !== process.env.BLINQ_WEBHOOK_SECRET) {
    console.error("Blinq webhook rejected: missing/incorrect secret");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!OWNER_ID) {
    console.error("Blinq webhook received but CRM_OWNER_USER_ID is not configured");
    return NextResponse.json({ error: "server not configured" }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const email = str(body.email);
  const phone = str(body.phone);
  const name = str(body.name);
  const firstName = str(body.first_name) ?? (name ? name.split(" ")[0] : null);
  const lastName = str(body.last_name) ?? (name ? name.split(" ").slice(1).join(" ") || null : null);
  const company = str(body.company);
  const jobTitle = str(body.job_title);
  const blinqContactId = str(body.blinq_contact_id) ?? str(body.id);

  if (!email && !phone) {
    console.log("Blinq webhook missing both email and phone, skipping", body);
    return NextResponse.json({ received: true });
  }

  const admin = createAdminClient();

  try {
    const contact = await findOrCreateContact(admin, OWNER_ID, {
      email,
      phone,
      firstName,
      lastName,
      leadSource: "Blinq",
    });
    if (!contact) return NextResponse.json({ received: true });

    await addTagByName(admin, OWNER_ID, contact.id, "Blinq");

    const details = [company, jobTitle].filter(Boolean).join(" · ");
    await upsertActivity(admin, OWNER_ID, contact.id, "blinq", "blinq_contact_id", blinqContactId, {
      type: "note",
      direction: "none",
      occurred_at: new Date().toISOString(),
      body: details ? `Shared a Blinq digital business card - ${details}` : "Shared a Blinq digital business card",
      metadata: { company, job_title: jobTitle, raw: body },
    });

    if (contact.wasCreated) {
      await notifyNewLead(admin, OWNER_ID, {
        title: "New contact via Blinq",
        body: `${firstName ?? email ?? phone} shared their digital business card`,
        url: `/contacts/${contact.id}`,
      });
    }
  } catch (err) {
    console.error("Error processing Blinq webhook", err);
  }

  return NextResponse.json({ received: true });
}
