"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { findOrCreateContact, addTagByName } from "@/lib/crm/find-or-create-contact";
import { upsertActivity } from "@/lib/crm/activities";
import { notifyNewLead } from "@/lib/push/send-push";
import { sendGmailMessage, textToHtml } from "@/lib/google/send-email";
import { sendQuoText } from "@/lib/quo/send-message";
import type { ListingFinancials } from "@/types/database";

const OWNER_ID = process.env.CRM_OWNER_USER_ID;
// She wants offer terms on her own phone, not only in the CRM - same
// hardcoded-contact-info convention as AGENT_SIGNATURE elsewhere.
const OWNER_PHONE = "+16788848494";
// Long enough that a lead who unlocks on a Friday can still open the
// documents Monday, short enough that an old link floating around doesn't
// keep working indefinitely.
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

const DOC_LABELS: Record<string, string> = { earnings_statement: "Earnings statement", t12: "T12" };

type ActionResult = { ok: true } | { ok: false; error: string };

async function findPublicListing(slug: string) {
  const admin = createAdminClient();
  const { data: listing } = await admin
    .from("listings")
    .select("id, address, nickname, financials")
    .eq("owner_id", OWNER_ID)
    .eq("public_slug", slug)
    .maybeSingle();
  return { admin, listing };
}

// Shared by unlockListingFinancials/submitListingOffer: the same
// "public form -> CRM contact" pathway every other public source uses
// (findOrCreateContact + tag + activity + push notify - see
// app/api/webhooks/house-hacking-site/route.ts).
async function captureContact(
  admin: ReturnType<typeof createAdminClient>,
  input: { name: string; phone?: string; email?: string },
  leadSource: string,
) {
  const name = input.name.trim();
  const phone = (input.phone ?? "").trim();
  const email = (input.email ?? "").trim();
  const [firstName, ...lastNameParts] = name.split(/\s+/).filter(Boolean);

  const contact = await findOrCreateContact(admin, OWNER_ID!, {
    email: email || null,
    phone: phone || null,
    firstName: firstName || null,
    lastName: lastNameParts.join(" ") || null,
    leadSource,
    contactType: "investor",
  });

  return { contact, name, firstName, phone, email };
}

// The underwriting gate: name + phone or email, in place, no navigation.
// Real financials are fetched here and returned to the client only on
// success - the locked page's HTML never contains them (see
// components/listings/om/FinancialGate.tsx).
export async function unlockListingFinancials(
  slug: string,
  input: { name: string; phone: string; email: string },
): Promise<ActionResult & { financials?: ListingFinancials }> {
  if (!OWNER_ID) return { ok: false, error: "Not configured" };
  if (!input.phone.trim() && !input.email.trim()) return { ok: false, error: "Enter a phone number or email" };

  const { admin, listing } = await findPublicListing(slug);
  if (!listing) return { ok: false, error: "This listing isn't available anymore" };
  const nickname = listing.nickname || listing.address;

  const { contact, name, firstName, phone, email } = await captureContact(admin, input, `Listing page — ${nickname}`);
  if (!contact) return { ok: false, error: "Enter a valid phone number or email" };

  await addTagByName(admin, OWNER_ID, contact.id, "Investor Lead");

  await upsertActivity(admin, OWNER_ID, contact.id, "listing_page", "listing_unlock_key", `${listing.id}:${contact.id}`, {
    type: "note",
    direction: "none",
    occurred_at: new Date().toISOString(),
    body: `Unlocked financials on ${nickname}`,
    metadata: { listing_id: listing.id },
  });

  await notifyNewLead(admin, OWNER_ID, {
    title: name || email || phone,
    body: `Unlocked financials on ${nickname}`,
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
      ? `Hi${firstName ? ` ${firstName}` : ""}! Here's the T12 and earnings statement for ${nickname}.\n\n${links.join("\n")}\n\nLet me know if you have any questions.\n\nCaitlyn Verdugo with KW Metro Atl`
      : `Hi${firstName ? ` ${firstName}` : ""}! Thanks for unlocking the numbers on ${nickname} — I'll follow up shortly with the source documents.\n\nCaitlyn Verdugo with KW Metro Atl`;

  if (email) await sendGmailMessage(admin, OWNER_ID, email, `Financials — ${nickname}`, textToHtml(messageBody));
  if (phone) await sendQuoText(phone, messageBody);

  return { ok: true, financials: (listing.financials as ListingFinancials | null) ?? undefined };
}

// The offer modal: not a contract, just terms she can call to confirm.
// Writes the full terms into the activity body so the timeline is readable
// without opening a separate record, moves the contact to Hot / Ready, and
// texts her directly - she wants this on her phone, not only in the CRM.
export async function submitListingOffer(
  slug: string,
  input: {
    name: string;
    phone: string;
    email: string;
    entity: string;
    price: string;
    emd: string;
    financing: string;
    dd: string;
    closing: string;
    notes: string;
  },
): Promise<ActionResult> {
  if (!OWNER_ID) return { ok: false, error: "Not configured" };
  if (!input.name.trim()) return { ok: false, error: "Enter your name" };
  if (!input.phone.trim()) return { ok: false, error: "Enter a phone number" };

  const { admin, listing } = await findPublicListing(slug);
  if (!listing) return { ok: false, error: "This listing isn't available anymore" };
  const nickname = listing.nickname || listing.address;

  const { contact, name } = await captureContact(admin, input, `Listing page offer — ${nickname}`);
  if (!contact) return { ok: false, error: "Enter a valid phone number" };

  await addTagByName(admin, OWNER_ID, contact.id, "Offer Submitted");

  const { data: hotStage } = await admin.from("pipeline_stages").select("id").eq("owner_id", OWNER_ID).eq("name", "Hot / Ready").maybeSingle();
  if (hotStage) await admin.from("contacts").update({ stage_id: hotStage.id }).eq("id", contact.id);

  const termsLines = [
    `Offer on ${nickname}`,
    input.price && `Price: ${input.price}`,
    input.emd && `EMD: ${input.emd}`,
    input.entity && `Entity: ${input.entity}`,
    input.financing && `Financing: ${input.financing}`,
    input.dd && `Due diligence: ${input.dd}`,
    input.closing && `Target closing: ${input.closing}`,
    input.notes && `Notes: ${input.notes}`,
  ].filter(Boolean);

  await upsertActivity(admin, OWNER_ID, contact.id, "listing_page", "listing_offer_key", `${listing.id}:${contact.id}:${Date.now()}`, {
    type: "note",
    direction: "none",
    occurred_at: new Date().toISOString(),
    body: termsLines.join(" — "),
    metadata: { listing_id: listing.id, offer: input },
  });

  await notifyNewLead(admin, OWNER_ID, { title: name, body: `Submitted an offer on ${nickname}`, url: `/contacts/${contact.id}` });
  await sendQuoText(OWNER_PHONE, termsLines.join("\n"));

  return { ok: true };
}

// The seller half of the page - no listing owns this lead, so it isn't
// scoped to a slug. "What would your PadSplit sell for?"
export async function requestSellerAnalysis(input: {
  name: string;
  phone: string;
  email: string;
  city: string;
  notes: string;
}): Promise<ActionResult> {
  if (!OWNER_ID) return { ok: false, error: "Not configured" };
  if (!input.name.trim()) return { ok: false, error: "Enter your name" };
  if (!input.phone.trim() && !input.email.trim()) return { ok: false, error: "Enter a phone number or email" };

  const admin = createAdminClient();
  const { contact, name } = await captureContact(admin, input, "Listing page — seller analysis request");
  if (!contact) return { ok: false, error: "Enter a valid phone number or email" };

  await addTagByName(admin, OWNER_ID, contact.id, "Seller Lead");

  const bodyParts = ["Requested a PadSplit valuation", input.city, input.notes].filter(Boolean);
  await upsertActivity(admin, OWNER_ID, contact.id, "listing_page", "listing_seller_key", `${contact.id}:${Date.now()}`, {
    type: "note",
    direction: "none",
    occurred_at: new Date().toISOString(),
    body: bodyParts.join(" — "),
    metadata: { city: input.city, notes: input.notes },
  });

  await notifyNewLead(admin, OWNER_ID, { title: name, body: "Wants a PadSplit valuation", url: `/contacts/${contact.id}` });

  return { ok: true };
}
