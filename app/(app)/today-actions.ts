"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { writeDismissal } from "@/lib/crm/dismissed-insights";

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

// "I don't actually need to text them back" - hides this specific message
// from Replies owed and stops the reply-reminder cron from ever nudging
// about it. Keyed to the activity row, not the contact, so a new inbound
// text from the same person later is unaffected.
export async function dismissReplyOwed(activityId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  await supabase.from("activities").update({ reply_dismissed_at: new Date().toISOString() }).eq("id", activityId).eq("owner_id", user.id);
  revalidatePath("/");
  revalidatePath("/messages");
  return { ok: true as const };
}

// The mobile Up-next card's Snooze button, for a call/task-shaped item
// (a replies-owed item uses dismissReplyOwed instead, which already
// exists and does the right thing for that case). Pushes the follow-up
// a day out rather than clearing it - "not now" not "never."
export async function snoozeFollowUp(contactId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await supabase.from("contacts").update({ next_follow_up_at: tomorrow }).eq("id", contactId).eq("owner_id", user.id);
  revalidatePath("/");
  return { ok: true as const };
}

// Genuinely clears the follow-up (vs. snoozeFollowUp's "push it a day") -
// for Today's Calls worklist, which had no dismiss at all: a contact with
// next_follow_up_at set kept showing up every single day with no way to
// say "I don't need to call this person" short of opening their record
// and clearing the date by hand.
export async function clearFollowUp(contactId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  await supabase.from("contacts").update({ next_follow_up_at: null }).eq("id", contactId).eq("owner_id", user.id);
  revalidatePath("/");
  return { ok: true as const };
}

// "No action needed for this registration" - Today's "Registered, no
// follow-up" group used to have no dismiss at all (only Calls/Replies
// owed did), so a vendor or plus-one who isn't a real lead reappeared
// every single day with no escape hatch. Reuses the same dismissed_insights
// table Insights/Sphere already write to (see lib/crm/contact-queue-filter.ts's
// filter, which only honors the dismissal while it's newer than the
// registration that triggered it).
export async function dismissRegisteredNoFollowUp(contactId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  await writeDismissal(supabase, user.id, "registered_no_followup", contactId);
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
