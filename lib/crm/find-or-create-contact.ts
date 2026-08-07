import type { SupabaseClient } from "@supabase/supabase-js";
import { phonesMatch } from "@/lib/phone";

// Shared across integrations (Quo, Calendly, Eventbrite, Jotform): find an
// existing contact by email and/or phone, or create a bare one so nothing
// gets lost. Matching by either field means a contact created from one
// source (e.g. Eventbrite) still gets recognized by another (e.g. Jotform)
// instead of spawning a duplicate.
export async function findOrCreateContact(
  admin: SupabaseClient,
  ownerId: string,
  input: {
    email?: string | null;
    phone?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    leadSource: string;
    contactType?: string;
  },
): Promise<{ id: string; wasCreated: boolean } | null> {
  const email = input.email?.trim().toLowerCase() || null;
  const phone = input.phone?.trim() || null;
  if (!email && !phone) return null;

  const { data: candidates } = await admin
    .from("contacts")
    .select("id, email, phone, secondary_phone")
    .eq("owner_id", ownerId)
    .eq("archived", false);

  const match = (candidates ?? []).find((c) => {
    const emailMatch = email && c.email && c.email.trim().toLowerCase() === email;
    const phoneMatch = phone && (phonesMatch(c.phone, phone) || phonesMatch(c.secondary_phone, phone));
    return emailMatch || phoneMatch;
  });
  if (match) return { id: match.id, wasCreated: false };

  const { data: firstStage } = await admin
    .from("pipeline_stages")
    .select("id")
    .eq("owner_id", ownerId)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: created, error } = await admin
    .from("contacts")
    .insert({
      owner_id: ownerId,
      first_name: input.firstName?.trim() || email || phone || "Unknown",
      last_name: input.lastName?.trim() || "",
      email,
      phone,
      contact_type: input.contactType ?? "other",
      lead_source: input.leadSource,
      stage_id: firstStage?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !created) return null;
  return { id: created.id, wasCreated: true };
}

export async function addTagByName(admin: SupabaseClient, ownerId: string, contactId: string, tagName: string) {
  let { data: tag } = await admin.from("tags").select("id").eq("owner_id", ownerId).eq("name", tagName).maybeSingle();

  if (!tag) {
    const { data: created } = await admin
      .from("tags")
      .insert({ owner_id: ownerId, name: tagName })
      .select("id")
      .maybeSingle();
    tag = created;
  }
  if (!tag) return;

  await admin.from("contact_tags").upsert({ contact_id: contactId, tag_id: tag.id }, { onConflict: "contact_id,tag_id" });
}
