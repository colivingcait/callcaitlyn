import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findOrCreateContact, addTagByName } from "@/lib/crm/find-or-create-contact";
import { upsertActivity } from "@/lib/crm/activities";
import { notifyNewLead } from "@/lib/push/send-push";

const OWNER_ID = process.env.CRM_OWNER_USER_ID;

// Unlike the other integrations, this endpoint is called directly from the
// house hacking site's own browser-side form components (replacing what
// used to be a direct fetch() to Kit's public form API) - there's no
// server-to-server secret to check the way Eventbrite/Jotform do. CORS
// isn't a real security boundary (curl doesn't send/enforce it), so the
// origin check below only exists to let the browser's preflight succeed for
// the real site - worst case if someone works around it is the same as any
// public contact form, a spam lead record.
const ALLOWED_ORIGINS = (
  process.env.HOUSE_HACKING_SITE_ORIGINS ?? "https://www.househackingatl.com,https://househackingatl.com"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function corsHeaders(request: NextRequest) {
  const origin = request.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

// Keyed by the site's form (not a specific guide/page), so "which one" is
// still visible in the lead source without needing a tag per guide title.
const SOURCE_LABELS: Record<string, string> = {
  gated_download: "House Hacking Site (Free Guide)",
  newsletter: "House Hacking Site (Newsletter)",
  listing_alerts: "House Hacking Site (Listing Alerts)",
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: NextRequest) {
  const headers = corsHeaders(request);

  if (!OWNER_ID) {
    console.error("House Hacking site signup received but CRM_OWNER_USER_ID is not configured");
    return NextResponse.json({ error: "server not configured" }, { status: 500, headers });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400, headers });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400, headers });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const [firstName, ...lastNameParts] = name.split(/\s+/).filter(Boolean);
  const phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null;
  const source = typeof body.source === "string" ? body.source : "unknown";
  const sourceDetail = typeof body.sourceDetail === "string" ? body.sourceDetail.trim() : null;
  const leadSource = SOURCE_LABELS[source] ?? "House Hacking Site";

  const admin = createAdminClient();

  try {
    const contact = await findOrCreateContact(admin, OWNER_ID, {
      email,
      phone,
      firstName: firstName || null,
      lastName: lastNameParts.join(" ") || null,
      leadSource,
    });

    if (!contact) {
      return NextResponse.json({ received: true }, { headers });
    }

    if (contact.wasCreated) {
      await notifyNewLead(admin, OWNER_ID, {
        title: "New house hacking site signup",
        body: `${firstName || email} signed up via ${leadSource}`,
        url: `/contacts/${contact.id}`,
      });
    }

    // Same "Meetup" tag Eventbrite/Jotform apply - both the Meetup Reminders
    // and House Hacking Content sequences target it, so this one tag is
    // what enrolls a site signup into both automatically.
    await addTagByName(admin, OWNER_ID, contact.id, "Meetup");
    await addTagByName(admin, OWNER_ID, contact.id, "House Hacking Site");

    const bodyParts = [`Signed up via ${leadSource}`];
    if (sourceDetail) bodyParts.push(sourceDetail);

    await upsertActivity(
      admin,
      OWNER_ID,
      contact.id,
      "house_hacking_site",
      "house_hacking_site_key",
      `${source}:${email.toLowerCase()}`,
      {
        type: "note",
        direction: "none",
        occurred_at: new Date().toISOString(),
        body: bodyParts.join(" — "),
        metadata: { source, source_detail: sourceDetail, raw: body },
      },
    );
  } catch (err) {
    console.error("Error processing House Hacking site signup", err);
  }

  return NextResponse.json({ received: true }, { headers });
}
