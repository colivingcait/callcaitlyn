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
import type { ListingStatus } from "@/types/database";

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
  const recipients = (agents ?? []).filter((a) => a.state !== "opted_out" && filter(a.state) && (input.channel === "email" ? !!a.email : !!a.phone));

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
