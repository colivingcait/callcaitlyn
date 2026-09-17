"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseRpExport, type ParsedRpRow } from "@/lib/listings/parse-rp-csv";
import { isAgentOptedOut, recordAgentOptOut } from "@/lib/listings/agent-lookup";
import { applyAgentMergeFields } from "@/lib/crm/listing-sends";
import { sendQuoText } from "@/lib/quo/send-message";
import { sendGmailMessage } from "@/lib/google/send-email";
import { draftToHtml } from "@/lib/crm/merge-fields";
import { baseUrl } from "@/lib/crm/sequences";
import { generateUniqueListingSlug } from "@/lib/listings/public-slug";
import type { ListingStatus, ListingDocumentType, ListingFinancials, ListingImprovement } from "@/types/database";

const PREVIEW_AGENT = { name: "Jamie Agent" };

type ActionResult<T extends object = Record<never, never>> = ({ ok: true } & T) | { ok: false; error: string };

export async function createListing(input: {
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  listPrice?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  propertyType?: string;
  mlsNumber?: string;
  status?: ListingStatus;
}): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!input.address.trim()) return { ok: false, error: "Enter an address" };

  const { data, error } = await supabase
    .from("listings")
    .insert({
      owner_id: user.id,
      address: input.address.trim(),
      city: input.city || null,
      state: input.state || null,
      zip: input.zip || null,
      list_price: input.listPrice ?? null,
      beds: input.beds ?? null,
      baths: input.baths ?? null,
      sqft: input.sqft ?? null,
      property_type: input.propertyType || null,
      mls_number: input.mlsNumber || null,
      status: input.status ?? "coming_soon",
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Couldn't create the listing" };
  revalidatePath("/listings");
  return { ok: true, id: data.id as string };
}

export async function updateListingBasics(
  listingId: string,
  input: {
    address?: string;
    listPrice?: number | null;
    beds?: number | null;
    baths?: number | null;
    sqft?: number | null;
    propertyType?: string | null;
    mlsNumber?: string | null;
    story?: string | null;
    zillowUrl?: string | null;
    padsplitUrl?: string | null;
  },
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const patch: Record<string, unknown> = {};
  if (input.address !== undefined) patch.address = input.address;
  if (input.listPrice !== undefined) patch.list_price = input.listPrice;
  if (input.beds !== undefined) patch.beds = input.beds;
  if (input.baths !== undefined) patch.baths = input.baths;
  if (input.sqft !== undefined) patch.sqft = input.sqft;
  if (input.propertyType !== undefined) patch.property_type = input.propertyType;
  if (input.mlsNumber !== undefined) patch.mls_number = input.mlsNumber;
  if (input.story !== undefined) patch.story = input.story;
  if (input.zillowUrl !== undefined) patch.zillow_url = input.zillowUrl;
  if (input.padsplitUrl !== undefined) patch.padsplit_url = input.padsplitUrl;
  patch.updated_at = new Date().toISOString();

  // A price edit here is also what should feed the price-drop send and
  // the seller update - if the price actually changed, log it before
  // overwriting so listing_price_changes stays the source of truth.
  if (input.listPrice !== undefined) {
    const { data: current } = await supabase.from("listings").select("list_price").eq("id", listingId).maybeSingle();
    if (current && current.list_price !== input.listPrice) {
      await supabase.from("listing_price_changes").insert({ listing_id: listingId, owner_id: user.id, old_price: current.list_price, new_price: input.listPrice });
    }
  }

  const { error } = await supabase.from("listings").update(patch).eq("id", listingId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/listings");
  revalidatePath(`/listings/${listingId}`);
  return { ok: true };
}

export async function updateListingStatus(listingId: string, status: ListingStatus): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase.from("listings").update({ status, updated_at: new Date().toISOString() }).eq("id", listingId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/listings");
  revalidatePath(`/listings/${listingId}`);
  return { ok: true };
}

// Import (or re-import) an FMLS/GAMLS reverse-prospecting export, pasted
// or uploaded as text either way. Keyed on (listing_id, ref_no) via the
// unique index in migration 0069 - re-importing an updated list updates
// existing rows instead of duplicating them. Also upserts the
// cross-listing `agents` directory by email, so a Coming Soon listing
// down the line can target everyone ever seen.
export async function importListingAgentsCsv(
  listingId: string,
  text: string,
): Promise<ActionResult<{ imported: number; updated: number; skipped: number; detectedAddress: string | null }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { rows, skipped, detectedAddress } = parseRpExport(text);
  if (rows.length === 0) return { ok: false, error: "Couldn't find any agent rows in that export" };

  const admin = createAdminClient();
  let imported = 0;
  let updated = 0;

  for (const row of rows as ParsedRpRow[]) {
    const optedOut = await isAgentOptedOut(admin, user.id, { email: row.email, phone: row.phone });

    const agentId = await upsertDirectoryAgent(admin, user.id, row, "fmls");

    const { data: existing } = await admin.from("listing_agents").select("id").eq("listing_id", listingId).eq("ref_no", row.refNo).maybeSingle();

    const payload = {
      listing_id: listingId,
      owner_id: user.id,
      agent_id: agentId,
      name: row.name,
      ref_no: row.refNo,
      brokerage: row.brokerage,
      email: row.email,
      phone: row.phone,
      count_sent: row.countSent,
      date_sent: row.dateSent,
      state: optedOut ? ("opted_out" as const) : undefined,
      raw: row.raw,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { state, ...rest } = payload;
      await admin.from("listing_agents").update(optedOut ? payload : rest).eq("id", existing.id);
      updated++;
    } else {
      await admin.from("listing_agents").insert({ ...payload, state: optedOut ? "opted_out" : "not_contacted" });
      imported++;
    }
  }

  revalidatePath(`/listings/${listingId}`);
  return { ok: true, imported, updated, skipped: skipped.length, detectedAddress };
}

async function upsertDirectoryAgent(
  admin: ReturnType<typeof createAdminClient>,
  ownerId: string,
  row: { name: string; brokerage: string | null; email: string | null; phone: string | null },
  source: "fmls" | "gamls" | "manual",
): Promise<string | null> {
  if (!row.email) return null;
  const email = row.email.toLowerCase();

  const { data: existing } = await admin.from("agents").select("id").eq("owner_id", ownerId).ilike("email", email).maybeSingle();
  if (existing) {
    await admin.from("agents").update({ name: row.name, brokerage: row.brokerage, phone: row.phone }).eq("id", existing.id);
    return existing.id as string;
  }

  const { data: created } = await admin
    .from("agents")
    .insert({ owner_id: ownerId, name: row.name, brokerage: row.brokerage, email, phone: row.phone, source })
    .select("id")
    .single();
  return (created?.id as string) ?? null;
}

export async function addAgentManually(input: { name: string; brokerage?: string; email?: string; phone?: string }): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!input.name.trim()) return { ok: false, error: "Enter a name" };

  const { error } = await supabase.from("agents").insert({
    owner_id: user.id,
    name: input.name.trim(),
    brokerage: input.brokerage || null,
    email: input.email?.toLowerCase() || null,
    phone: input.phone || null,
    source: "manual",
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/listings/directory");
  return { ok: true };
}

// Deliberate, never automatic (README §8) - brokerage rides along via the
// `company` column added in migration 0069.
export async function promoteAgentToContact(input: { name: string; brokerage: string | null; email: string | null; phone: string | null }): Promise<ActionResult<{ contactId: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const [firstName, ...rest] = input.name.trim().split(/\s+/);
  const { data, error } = await supabase
    .from("contacts")
    .insert({
      owner_id: user.id,
      first_name: firstName || input.name,
      last_name: rest.join(" ") || "",
      email: input.email,
      phone: input.phone,
      company: input.brokerage,
      contact_type: "referral_partner",
      lead_source: "Referral partner (agent)",
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Couldn't add them as a contact" };
  revalidatePath("/contacts");
  return { ok: true, contactId: data.id as string };
}

const AUDIENCE_FILTER: Record<string, (state: string) => boolean> = {
  all: () => true,
  not_contacted: (s) => s === "not_contacted",
  non_repliers: (s) => s === "emailed" || s === "texted",
};

// Creates a send tracked entirely inside the listing - never a
// text_blasts/sequence row, never shown in Campaigns. Recipients are
// snapshotted now (same reasoning as text_blasts), excluding anyone
// already opted out. Immediate sends process on the next cron tick (same
// 15-minute cadence as send-text-blasts), same as every other bulk send
// in this app - nothing here blocks on the actual send completing.
export async function createListingSend(input: {
  listingId: string;
  channel: "email" | "text";
  subject?: string;
  message: string;
  audience: "all" | "not_contacted" | "non_repliers";
  sendImmediately: boolean;
  // Text path: the composer splits Fresh vs Recent and sends one bucket
  // per confirm. IDs must belong to this listing; opted-out / no-phone
  // rows are still dropped here so a stale client list can't sneak them in.
  listingAgentIds?: string[];
}): Promise<ActionResult<{ sendId: string; recipientCount: number }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!input.message.trim()) return { ok: false, error: "Write a message first" };
  if (input.channel === "email" && !input.subject?.trim()) return { ok: false, error: "Give the email a subject" };

  const { data: agents } = await supabase.from("listing_agents").select("id, state, email, phone").eq("listing_id", input.listingId);
  const filter = AUDIENCE_FILTER[input.audience];
  const allowedIds = input.listingAgentIds ? new Set(input.listingAgentIds) : null;
  const recipients = (agents ?? []).filter((a) => {
    if (a.state === "opted_out") return false;
    if (input.channel === "email" ? !a.email : !a.phone) return false;
    if (allowedIds) return allowedIds.has(a.id);
    return filter(a.state);
  });

  if (recipients.length === 0) return { ok: false, error: "No one in this audience can receive that channel" };

  const { data: send, error } = await supabase
    .from("listing_sends")
    .insert({
      owner_id: user.id,
      listing_id: input.listingId,
      channel: input.channel,
      subject: input.subject?.trim() || null,
      message: input.message.trim(),
      send_immediately: input.sendImmediately,
    })
    .select("id")
    .single();
  if (error || !send) return { ok: false, error: error?.message ?? "Couldn't create the send" };

  const { error: recipientError } = await supabase
    .from("listing_send_recipients")
    .insert(recipients.map((a) => ({ send_id: send.id, listing_agent_id: a.id })));
  if (recipientError) return { ok: false, error: recipientError.message };

  revalidatePath(`/listings/${input.listingId}`);
  return { ok: true, sendId: send.id as string, recipientCount: recipients.length };
}

export async function cancelListingSend(sendId: string, listingId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  await supabase.from("listing_send_recipients").update({ status: "skipped", error: "Canceled" }).eq("send_id", sendId).eq("status", "pending");
  const { error } = await supabase.from("listing_sends").update({ status: "canceled", completed_at: new Date().toISOString() }).eq("id", sendId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/listings/${listingId}`);
  return { ok: true };
}

// The reply side of "When an agent calls or texts you" - a sibling to
// sendTextToContact that sends to a raw number instead of a contact and
// logs to listing_agent_messages instead of activities.
export async function replyToAgent(input: { listingId: string; listingAgentId: string | null; agentId: string | null; phone: string; body: string }): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!input.body.trim()) return { ok: false, error: "Write something first" };

  const result = await sendQuoText(input.phone, input.body.trim());
  if (!result.ok) return { ok: false, error: result.error };

  await supabase.from("listing_agent_messages").insert({
    listing_id: input.listingId,
    listing_agent_id: input.listingAgentId,
    agent_id: input.agentId,
    owner_id: user.id,
    direction: "outbound",
    channel: "text",
    body: input.body.trim(),
    occurred_at: new Date().toISOString(),
    quo_message_id: result.quoMessageId,
  });

  revalidatePath(`/listings/${input.listingId}`);
  return { ok: true };
}

export async function recordAgentOptOutManually(input: { email?: string; phone?: string }): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  await recordAgentOptOut(supabase, user.id, { email: input.email, phone: input.phone });
  revalidatePath("/listings");
  return { ok: true };
}

// Storage upload itself happens client-side (see PhotoUploader) - this
// just records the resulting path once it's up there. Requires the
// "listing-photos" public bucket to already exist (Supabase dashboard ->
// Storage -> New bucket - see migration 0069's header comment); nothing
// here creates it.
export async function addListingPhoto(listingId: string, path: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { data: listing } = await supabase.from("listings").select("photo_paths").eq("id", listingId).maybeSingle();
  if (!listing) return { ok: false, error: "Listing not found" };

  const { error } = await supabase.from("listings").update({ photo_paths: [...listing.photo_paths, path] }).eq("id", listingId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/listings/${listingId}`);
  return { ok: true };
}

export async function removeListingPhoto(listingId: string, path: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { data: listing } = await supabase.from("listings").select("photo_paths").eq("id", listingId).maybeSingle();
  if (!listing) return { ok: false, error: "Listing not found" };

  const { error } = await supabase
    .from("listings")
    .update({ photo_paths: listing.photo_paths.filter((p: string) => p !== path) })
    .eq("id", listingId);
  if (error) return { ok: false, error: error.message };

  await supabase.storage.from("listing-photos").remove([path]);
  revalidatePath(`/listings/${listingId}`);
  return { ok: true };
}

export async function sendTestListingText(message: string, phone: string): Promise<ActionResult<{ sentBody: string }>> {
  if (!phone.trim()) return { ok: false, error: "Enter a phone number" };
  if (!message.trim()) return { ok: false, error: "Write a message first" };
  const body = applyAgentMergeFields(message, PREVIEW_AGENT);
  const result = await sendQuoText(phone.trim(), body);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, sentBody: body };
}

export async function sendTestListingEmail(subject: string, message: string, toEmail: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!toEmail.trim()) return { ok: false, error: "Enter an email address" };
  if (!message.trim()) return { ok: false, error: "Write a message first" };

  const admin = createAdminClient();
  const body = applyAgentMergeFields(message, PREVIEW_AGENT);
  const result = await sendGmailMessage(admin, user.id, toEmail.trim(), subject.trim() || "New listing", draftToHtml(body));
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}

// The "own Zillow" public page toggle: on generates a human-readable slug
// (idempotent - a listing that already has one keeps it, so a previously
// shared link never breaks) and, only if the Zillow field is still empty,
// fills it with the new public page link so every existing outreach
// template picks it up on the next send with no other changes. Off clears
// the slug, so the old link stops resolving - re-enabling later generates
// a fresh one rather than restoring the exact same URL.
export async function setListingPublicPage(listingId: string, enabled: boolean): Promise<ActionResult<{ url: string | null }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const admin = createAdminClient();
  const { data: listing } = await supabase.from("listings").select("address, public_slug, zillow_url").eq("id", listingId).maybeSingle();
  if (!listing) return { ok: false, error: "Listing not found" };

  if (!enabled) {
    const { error } = await supabase.from("listings").update({ public_slug: null }).eq("id", listingId);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/listings/${listingId}`);
    return { ok: true, url: null };
  }

  const slug = listing.public_slug ?? (await generateUniqueListingSlug(admin, listing.address));
  const url = `${baseUrl()}/listing/${slug}`;
  const patch: Record<string, unknown> = { public_slug: slug };
  if (!listing.zillow_url) patch.zillow_url = url;

  const { error } = await supabase.from("listings").update(patch).eq("id", listingId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/listings/${listingId}`);
  return { ok: true, url };
}

// Storage upload happens client-side (see DocumentUploader) against the
// private "listing-documents" bucket - this just records the resulting
// path. Requires that bucket to already exist (Supabase dashboard ->
// Storage -> New bucket -> PRIVATE - see migration 0072's header comment);
// nothing here creates it. Re-uploading a doc type replaces the existing
// row (and its old file) rather than accumulating stale versions.
export async function addListingDocument(listingId: string, docType: ListingDocumentType, path: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { data: existing } = await supabase
    .from("listing_documents")
    .select("storage_path")
    .eq("listing_id", listingId)
    .eq("doc_type", docType)
    .maybeSingle();

  const { error } = await supabase
    .from("listing_documents")
    .upsert(
      { listing_id: listingId, owner_id: user.id, doc_type: docType, storage_path: path, uploaded_at: new Date().toISOString() },
      { onConflict: "listing_id,doc_type" },
    );
  if (error) return { ok: false, error: error.message };

  if (existing && existing.storage_path !== path) {
    await supabase.storage.from("listing-documents").remove([existing.storage_path]);
  }

  revalidatePath(`/listings/${listingId}`);
  return { ok: true };
}

export async function removeListingDocument(listingId: string, docType: ListingDocumentType): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { data: existing } = await supabase
    .from("listing_documents")
    .select("id, storage_path")
    .eq("listing_id", listingId)
    .eq("doc_type", docType)
    .maybeSingle();
  if (!existing) return { ok: true };

  const { error } = await supabase.from("listing_documents").delete().eq("id", existing.id);
  if (error) return { ok: false, error: error.message };

  await supabase.storage.from("listing-documents").remove([existing.storage_path]);
  revalidatePath(`/listings/${listingId}`);
  return { ok: true };
}

// Every field the public offering-memorandum page shows beyond what
// BasicsForm already covers - identity (since the address is never shown
// there), property detail, the public description, the four "band" display
// strings, co-listing agent, and process terms.
export async function updateListingOmFields(
  listingId: string,
  input: {
    nickname?: string | null;
    omNumber?: string | null;
    submarket?: string | null;
    yearBuilt?: number | null;
    yearRenovated?: number | null;
    privateBathrooms?: number | null;
    padsplitSince?: string | null;
    parking?: string | null;
    laundry?: string | null;
    furnishings?: string | null;
    publicDescription?: string | null;
    bandGrossRent?: string | null;
    bandExpenseLoad?: string | null;
    bandCashOnCash?: string | null;
    bandCapRate?: string | null;
    coAgentName?: string | null;
    coAgentBrokerage?: string | null;
    coAgentPhone?: string | null;
    coAgentEmail?: string | null;
    ddDays?: number | null;
    sellerSupportDays?: number | null;
    showSellerSection?: boolean;
  },
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const patch: Record<string, unknown> = {};
  if (input.nickname !== undefined) patch.nickname = input.nickname;
  if (input.omNumber !== undefined) patch.om_number = input.omNumber;
  if (input.submarket !== undefined) patch.submarket = input.submarket;
  if (input.yearBuilt !== undefined) patch.year_built = input.yearBuilt;
  if (input.yearRenovated !== undefined) patch.year_renovated = input.yearRenovated;
  if (input.privateBathrooms !== undefined) patch.private_bathrooms = input.privateBathrooms;
  if (input.padsplitSince !== undefined) patch.padsplit_since = input.padsplitSince;
  if (input.parking !== undefined) patch.parking = input.parking;
  if (input.laundry !== undefined) patch.laundry = input.laundry;
  if (input.furnishings !== undefined) patch.furnishings = input.furnishings;
  if (input.publicDescription !== undefined) patch.public_description = input.publicDescription;
  if (input.bandGrossRent !== undefined) patch.band_gross_rent = input.bandGrossRent;
  if (input.bandExpenseLoad !== undefined) patch.band_expense_load = input.bandExpenseLoad;
  if (input.bandCashOnCash !== undefined) patch.band_cash_on_cash = input.bandCashOnCash;
  if (input.bandCapRate !== undefined) patch.band_cap_rate = input.bandCapRate;
  if (input.coAgentName !== undefined) patch.co_agent_name = input.coAgentName;
  if (input.coAgentBrokerage !== undefined) patch.co_agent_brokerage = input.coAgentBrokerage;
  if (input.coAgentPhone !== undefined) patch.co_agent_phone = input.coAgentPhone;
  if (input.coAgentEmail !== undefined) patch.co_agent_email = input.coAgentEmail;
  if (input.ddDays !== undefined) patch.dd_days = input.ddDays;
  if (input.sellerSupportDays !== undefined) patch.seller_support_days = input.sellerSupportDays;
  if (input.showSellerSection !== undefined) patch.show_seller_section = input.showSellerSection;

  const { error } = await supabase.from("listings").update(patch).eq("id", listingId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/listings/${listingId}`);
  return { ok: true };
}

// Gated underwriting detail - one jsonb column (see migration 0073's
// comment on why) rather than a fixed set of expense columns, since the
// T12 line count and scenario count both vary per listing.
export async function updateListingFinancials(listingId: string, financials: ListingFinancials | null): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase.from("listings").update({ financials }).eq("id", listingId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/listings/${listingId}`);
  return { ok: true };
}

// Capital improvements are optional - an empty/null array hides the
// section on the public page entirely rather than showing a blank block.
export async function updateListingImprovements(listingId: string, improvements: ListingImprovement[] | null): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase.from("listings").update({ improvements }).eq("id", listingId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/listings/${listingId}`);
  return { ok: true };
}

// Auto-filter (exterior category regex) plus this manual override, per the
// client's explicit requirement - the regex will miss things, and she needs
// to be able to kill a specific interior photo too.
export async function updateExcludedPhotos(listingId: string, excludedUrls: string[]): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase.from("listings").update({ excluded_photo_urls: excludedUrls }).eq("id", listingId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/listings/${listingId}`);
  return { ok: true };
}
