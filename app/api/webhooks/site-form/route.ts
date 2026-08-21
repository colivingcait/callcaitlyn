import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findOrCreateContact, addTagByName } from "@/lib/crm/find-or-create-contact";
import { upsertActivity } from "@/lib/crm/activities";
import { notifyNewLead } from "@/lib/push/send-push";
import type { ContactType } from "@/types/database";

const OWNER_ID = process.env.CRM_OWNER_USER_ID;

// One shared intake endpoint for every marketing-site form that isn't
// House Hacking ATL (that site has its own dedicated route, already live -
// see app/api/webhooks/house-hacking-site/route.ts). Adding a new form here
// means adding one FORM_CONFIGS entry, not a new route file.
type SiteKey = "atlanta_women_investors" | "womens_coliving_summit" | "colivingcait";

const SITE_CONFIGS: Record<SiteKey, { defaultOrigins: string[]; envVar: string }> = {
  atlanta_women_investors: { defaultOrigins: ["https://atlantawomeninvestors.com", "https://www.atlantawomeninvestors.com"], envVar: "AWI_SITE_ORIGINS" },
  womens_coliving_summit: { defaultOrigins: ["https://womenscolivingsummit.com", "https://www.womenscolivingsummit.com"], envVar: "WCS_SITE_ORIGINS" },
  colivingcait: { defaultOrigins: ["https://colivingcait.com", "https://www.colivingcait.com"], envVar: "COLIVINGCAIT_SITE_ORIGINS" },
};

// Keyed by "site:form" so the same form name (e.g. "newsletter") can carry a
// different label/tags per site. leadSource is what shows in the Contacts
// list and reports; tags drive sequence enrollment (Settings > Tags).
const FORM_CONFIGS: Record<string, { leadSource: string; tags: string[]; contactType?: ContactType }> = {
  "atlanta_women_investors:subscribe": { leadSource: "Atlanta Women Investors (Newsletter)", tags: ["Meetup", "Women's REI"], contactType: "attendee" },

  "womens_coliving_summit:newsletter": { leadSource: "Women's Coliving Summit (Newsletter)", tags: ["WCS"] },
  "womens_coliving_summit:exit_intent": { leadSource: "Women's Coliving Summit (Exit Intent)", tags: ["WCS"] },
  "womens_coliving_summit:sponsor": { leadSource: "Women's Coliving Summit (Sponsor Inquiry)", tags: ["WCS", "Sponsor Lead"] },
  "womens_coliving_summit:speaker": { leadSource: "Women's Coliving Summit (Speaker Application)", tags: ["WCS", "Speaker Lead"] },
  "womens_coliving_summit:referral": { leadSource: "Women's Coliving Summit (Referral)", tags: ["WCS"] },
  "womens_coliving_summit:explore_signup": { leadSource: "Women's Coliving Summit (Explore Signup)", tags: ["WCS"] },

  "colivingcait:contact": { leadSource: "CoLivingCait (Contact Form)", tags: [] },
  "colivingcait:buyer_inquiry": { leadSource: "CoLivingCait (Buyer Inquiry)", tags: ["Buyer Lead"], contactType: "buyer" },
  "colivingcait:seller_inquiry": { leadSource: "CoLivingCait (Seller Inquiry)", tags: ["Seller Lead"], contactType: "seller" },
  "colivingcait:lead_magnet": { leadSource: "CoLivingCait (Lead Magnet)", tags: [] },
  "colivingcait:calculator": { leadSource: "CoLivingCait (Calculator)", tags: [] },
  "colivingcait:newsletter": { leadSource: "CoLivingCait (Newsletter)", tags: [] },
};

function allowedOrigins(site: SiteKey): string[] {
  const config = SITE_CONFIGS[site];
  const fromEnv = process.env[config.envVar];
  if (!fromEnv) return config.defaultOrigins;
  return fromEnv
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

function corsHeaders(request: NextRequest, site: SiteKey | null) {
  const origin = request.headers.get("origin");
  const origins = site ? allowedOrigins(site) : [];
  return {
    "Access-Control-Allow-Origin": origin && origins.includes(origin) ? origin : origins[0] ?? "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS(request: NextRequest) {
  const url = new URL(request.url);
  const site = url.searchParams.get("site") as SiteKey | null;
  return new NextResponse(null, { status: 204, headers: corsHeaders(request, site) });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const site = typeof body.site === "string" ? (body.site as SiteKey) : null;
  const headers = corsHeaders(request, site);

  if (!OWNER_ID) {
    console.error("Site form submission received but CRM_OWNER_USER_ID is not configured");
    return NextResponse.json({ error: "server not configured" }, { status: 500, headers });
  }
  if (!site || !SITE_CONFIGS[site]) {
    return NextResponse.json({ error: "unknown or missing site" }, { status: 400, headers });
  }

  const form = typeof body.form === "string" ? body.form : "unknown";
  const config = FORM_CONFIGS[`${site}:${form}`];
  // An unrecognized form key still gets recorded (rather than dropped) so a
  // new form added on the site side before its FORM_CONFIGS entry lands
  // here doesn't silently lose leads - it just shows up under a generic
  // label until the entry is added.
  const leadSource = config?.leadSource ?? `${site} (${form})`;

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400, headers });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const bodyFirstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const bodyLastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const [nameFirst, ...nameLastParts] = name.split(/\s+/).filter(Boolean);
  const firstName = bodyFirstName || nameFirst || null;
  const lastName = bodyLastName || nameLastParts.join(" ") || null;
  const phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null;
  const message = typeof body.message === "string" ? body.message.trim() : null;
  const fields = body.fields && typeof body.fields === "object" ? (body.fields as Record<string, unknown>) : null;

  const admin = createAdminClient();

  try {
    const contact = await findOrCreateContact(admin, OWNER_ID, {
      email,
      phone,
      firstName,
      lastName,
      leadSource,
      contactType: config?.contactType,
    });

    if (!contact) {
      return NextResponse.json({ received: true }, { headers });
    }

    if (contact.wasCreated) {
      await notifyNewLead(admin, OWNER_ID, {
        title: "New site form submission",
        body: `${firstName || email} submitted ${leadSource}`,
        url: `/contacts/${contact.id}`,
      });
    }

    for (const tag of config?.tags ?? []) {
      await addTagByName(admin, OWNER_ID, contact.id, tag);
    }

    const bodyParts = [`Submitted ${leadSource}`];
    if (message) bodyParts.push(message);
    if (fields) {
      for (const [key, value] of Object.entries(fields)) {
        if (typeof value === "string" && value.trim()) bodyParts.push(`${key}: ${value.trim()}`);
      }
    }

    // Keyed by site+form+email, same dedup pattern as house-hacking-site -
    // a re-submission of the same form updates the existing activity in
    // place rather than piling up duplicates.
    await upsertActivity(admin, OWNER_ID, contact.id, "site_form", "site_form_key", `${site}:${form}:${email.toLowerCase()}`, {
      type: "note",
      direction: "none",
      occurred_at: new Date().toISOString(),
      body: bodyParts.join(" — "),
      metadata: { site, form, message, fields, raw: body },
    });
  } catch (err) {
    console.error("Error processing site form submission", err);
  }

  return NextResponse.json({ received: true }, { headers });
}
