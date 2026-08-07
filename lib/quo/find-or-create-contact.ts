import type { SupabaseClient } from "@supabase/supabase-js";
import { phonesMatch } from "@/lib/phone";

export async function findOrCreateContactByPhone(
  admin: SupabaseClient,
  ownerId: string,
  phoneNumber: string | null,
): Promise<string | null> {
  if (!phoneNumber) return null;

  const { data: candidates } = await admin
    .from("contacts")
    .select("id, phone, secondary_phone")
    .eq("owner_id", ownerId)
    .eq("archived", false);

  const match = (candidates ?? []).find(
    (c) => phonesMatch(c.phone, phoneNumber) || phonesMatch(c.secondary_phone, phoneNumber),
  );
  if (match) return match.id;

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
      first_name: phoneNumber,
      contact_type: "other",
      lead_source: "Quo (auto-created from call/text)",
      phone: phoneNumber,
      stage_id: firstStage?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !created) return null;
  return created.id;
}
