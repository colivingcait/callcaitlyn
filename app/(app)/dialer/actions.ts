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

// "Connected" - removes the contact from the dialer queue for good, right
// away. Reclassifying/adding notes is a separate follow-up step (see
// saveDialerNotes below) so closing that modal without filling it in
// doesn't leave them stuck back on the call list.
export async function markDialerConnected(contactId: string) {
  const supabase = await createClient();
  await supabase
    .from("contacts")
    .update({ dialer_contacted_at: new Date().toISOString(), dialer_snoozed_at: null })
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
