"use server";

import { createClient } from "@/lib/supabase/server";

// "No answer / voicemail / too short to count" - doesn't remove the
// contact from the dialer queue, just pushes them below anyone not yet
// tried. Silent by design (no modal) since nothing worth recording
// happened.
export async function markDialerSnoozed(contactId: string) {
  const supabase = await createClient();
  await supabase.from("contacts").update({ dialer_snoozed_at: new Date().toISOString() }).eq("id", contactId);
}

// "Connected" - clears this contact off the New Registrations queue for
// their current registration. Reclassifying/adding notes is a separate
// follow-up step (see saveDialerNotes below) so closing that modal
// without filling it in doesn't leave them stuck back on the call list.
// If they register again later, this timestamp is older than the new
// registration, so they naturally reappear - "contacted" means "since
// their last registration," not "forever."
export async function markDialerConnected(contactId: string) {
  const supabase = await createClient();
  await supabase
    .from("contacts")
    .update({ dialer_contacted_at: new Date().toISOString(), dialer_snoozed_at: null })
    .eq("id", contactId);
}

// "Dismiss" - same underlying effect as Connected (clears this specific
// registration off the queue), but means "no action needed" rather than
// "I called them" - for repeat registrants she doesn't want to reach out
// to every time (vendors, etc.). Separate name so the intent is clear in
// the code even though the data change is identical.
export async function markDialerDismissed(contactId: string) {
  const supabase = await createClient();
  await supabase
    .from("contacts")
    .update({ dialer_contacted_at: new Date().toISOString(), dialer_snoozed_at: null })
    .eq("id", contactId);
}

// Same idea as markDialerSnoozed/markDialerConnected above, but for the
// separate post-event follow-up queue - independent tracking columns so
// calling someone at registration doesn't also mark their (not-yet-
// happened) post-event follow-up as done, or vice versa.
export async function markEventFollowupSnoozed(contactId: string) {
  const supabase = await createClient();
  await supabase.from("contacts").update({ event_followup_snoozed_at: new Date().toISOString() }).eq("id", contactId);
}

export async function markEventFollowupConnected(contactId: string) {
  const supabase = await createClient();
  await supabase
    .from("contacts")
    .update({ event_followup_contacted_at: new Date().toISOString(), event_followup_snoozed_at: null })
    .eq("id", contactId);
}

// Optional reclassify + notes after a Connected call. The real call data
// (duration, recording, transcript) arrives separately and asynchronously
// via Quo's webhook straight onto the contact's activity timeline - this
// doesn't need to wait for it.
export async function saveDialerNotes(contactId: string, stageId: string | null, note: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  if (stageId) await supabase.from("contacts").update({ stage_id: stageId }).eq("id", contactId);

  if (note.trim()) {
    await supabase.from("activities").insert({
      owner_id: user.id,
      contact_id: contactId,
      type: "note",
      direction: "none",
      source: "manual",
      occurred_at: new Date().toISOString(),
      body: note.trim(),
      metadata: { via: "dialer" },
    });
  }
}
