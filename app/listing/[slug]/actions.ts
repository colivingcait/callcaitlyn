"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { findOrCreateContact, addTagByName } from "@/lib/crm/find-or-create-contact";
import { upsertActivity } from "@/lib/crm/activities";
import { notifyNewLead } from "@/lib/push/send-push";
import { sendGmailMessage, textToHtml } from "@/lib/google/send-email";
import { sendQuoText } from "@/lib/quo/send-message";

const OWNER_ID = process.env.CRM_OWNER_USER_ID;
// Long enough that a lead who requests the packet on a Friday can still
// open it Monday, short enough that an old link floating around doesn't
// keep working indefinitely.
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

const DOC_LABELS: Record<string, string> = { earnings_statement: "Earnings statement", t12: "T12" };

type ActionResult = { ok: true } | { ok: false; error: string };

// The public page's gate: name + phone or email in exchange for the
// financial packet. Fires the same "public form -> CRM contact" pathway
// every other public source uses (findOrCreateContact + tag + activity +
// push notify - see app/api/webhooks/house-hacking-site/route.ts), then
// sends the packet immediately by email and text rather than queuing it
// into a sequence, since she wants both the notification and the send to
// happen right away.
export async function requestListingPacket(
  slug: string,
  input: { name: string; phone: string; email: string },
): Promise<ActionResult> {
  if (!OWNER_ID) return { ok: false, error: "Not configured" };
  const name = input.name.trim();
  const phone = input.phone.trim();
  const email = input.email.trim();
  if (!phone && !email) return { ok: false, error: "Enter a phone number or email" };

  const admin = createAdminClient();
  const { data: listing } = await admin
    .from("listings")
    .select("id, address, city, state")
    .eq("owner_id", OWNER_ID)
    .eq("public_slug", slug)
    .maybeSingle();
  if (!listing) return { ok: false, error: "This listing isn't available anymore" };

  const [firstName, ...lastNameParts] = name.split(/\s+/).filter(Boolean);
  const locationLabel = [listing.city, listing.state].filter(Boolean).join(", ") || listing.address;

  const contact = await findOrCreateContact(admin, OWNER_ID, {
    email: email || null,
    phone: phone || null,
    firstName: firstName || null,
    lastName: lastNameParts.join(" ") || null,
    leadSource: `Listing page — ${listing.address}`,
    contactType: "investor",
  });
  if (!contact) return { ok: false, error: "Enter a valid phone number or email" };

  await addTagByName(admin, OWNER_ID, contact.id, "Investor Lead");

  await upsertActivity(admin, OWNER_ID, contact.id, "listing_page", "listing_page_lead_key", `${listing.id}:${contact.id}`, {
    type: "note",
    direction: "none",
    occurred_at: new Date().toISOString(),
    body: `Requested the financial packet for ${listing.address}`,
    metadata: { listing_id: listing.id },
  });

  // Every request gets a notification, not just first-time contacts - a
  // repeat request for the packet is itself worth knowing about.
  await notifyNewLead(admin, OWNER_ID, {
    title: name || email || phone,
    body: `Requested the financial packet for ${locationLabel}`,
    url: `/contacts/${contact.id}`,
  });

  const { data: documents } = await admin.from("listing_documents").select("doc_type, storage_path").eq("listing_id", listing.id);
  const links: string[] = [];
  for (const doc of documents ?? []) {
    const { data: signed } = await admin.storage.from("listing-documents").createSignedUrl(doc.storage_path, SIGNED_URL_TTL_SECONDS);
    if (signed?.signedUrl) links.push(`${DOC_LABELS[doc.doc_type] ?? doc.doc_type}: ${signed.signedUrl}`);
  }

  const messageBody =
    links.length > 0
      ? `Hi${firstName ? ` ${firstName}` : ""}! Here's the financial packet for ${listing.address}.\n\n${links.join("\n")}\n\nLet me know if you have any questions.\n\nCaitlyn Verdugo with KW Metro Atl`
      : `Hi${firstName ? ` ${firstName}` : ""}! Thanks for your interest in ${listing.address} — I'll follow up shortly with the financial packet.\n\nCaitlyn Verdugo with KW Metro Atl`;

  if (email) {
    await sendGmailMessage(admin, OWNER_ID, email, `Financial packet — ${listing.address}`, textToHtml(messageBody));
  }
  if (phone) {
    await sendQuoText(phone, messageBody);
  }

  return { ok: true };
}
