"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function clearPinnedItem(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  await supabase.from("pinned_today_items").update({ cleared_at: new Date().toISOString() }).eq("id", id).eq("owner_id", user.id);
  revalidatePath("/");
  return { ok: true as const };
}

// The specific bug the owner described: a double-fired Eventbrite webhook
// logs the same registration twice a few seconds apart, which inflates
// the dialer's registration count for that contact and makes a genuinely
// new registrant look like a returning one. Deleting the later of the two
// near-duplicate rows restores the correct count - the pair was already
// surfaced by buildWeeklyReview's <5-second-apart check, so this only
// ever touches a row a person has been shown and clicked "Fix to New" on.
export async function fixDoubleRegistration(secondActivityId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  await supabase.from("activities").delete().eq("id", secondActivityId).eq("owner_id", user.id).eq("source", "eventbrite");
  revalidatePath("/");
  return { ok: true as const };
}

export async function markKnownPersonally(contactId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  await supabase.from("contacts").update({ known_personally: true }).eq("id", contactId).eq("owner_id", user.id);
  revalidatePath("/");
  return { ok: true as const };
}
