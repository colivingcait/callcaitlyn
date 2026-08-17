"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TextBlast } from "@/types/database";

// Recipients are snapshotted here, at creation time - not re-queried live
// by the sender - so a blast already trickling out doesn't silently pick
// up a new registration that comes in an hour into the send.
export async function createTextBlast(eventName: string, message: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };
  if (!eventName.trim()) return { ok: false as const, error: "Pick an event" };
  if (!message.trim()) return { ok: false as const, error: "Write a message" };

  const admin = createAdminClient();

  const { data: registrations } = await admin
    .from("activities")
    .select("contact_id")
    .eq("owner_id", user.id)
    .eq("source", "eventbrite")
    .eq("metadata->>event_name", eventName);

  const contactIds = [...new Set((registrations ?? []).map((r) => r.contact_id as string))];
  if (contactIds.length === 0) return { ok: false as const, error: "No registrants found for that event" };

  const { data: contacts } = await admin
    .from("contacts")
    .select("id, phone")
    .in("id", contactIds)
    .eq("archived", false)
    .not("phone", "is", null);

  if (!contacts?.length) return { ok: false as const, error: "None of the registrants have a phone number on file" };

  const { data: blast, error: blastError } = await admin
    .from("text_blasts")
    .insert({ owner_id: user.id, event_name: eventName, message: message.trim() })
    .select("id")
    .single();
  if (blastError || !blast) return { ok: false as const, error: blastError?.message ?? "Failed to create blast" };

  await admin.from("text_blast_recipients").insert(contacts.map((c) => ({ blast_id: blast.id, contact_id: c.id })));

  return { ok: true as const, blastId: blast.id as string, recipientCount: contacts.length };
}

export async function cancelTextBlast(blastId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const admin = createAdminClient();
  await admin.from("text_blast_recipients").update({ status: "skipped" }).eq("blast_id", blastId).eq("status", "pending");
  await admin.from("text_blasts").update({ status: "canceled", completed_at: new Date().toISOString() }).eq("id", blastId).eq("owner_id", user.id);
}

export type TextBlastWithProgress = TextBlast & { total: number; sent: number; failed: number; skipped: number; pending: number };

export async function getTextBlastsForEvent(eventName: string): Promise<TextBlastWithProgress[]> {
  const supabase = await createClient();
  const { data: blasts } = await supabase
    .from("text_blasts")
    .select("*")
    .eq("event_name", eventName)
    .order("created_at", { ascending: false })
    .limit(10);
  if (!blasts?.length) return [];

  const { data: recipients } = await supabase
    .from("text_blast_recipients")
    .select("blast_id, status")
    .in(
      "blast_id",
      blasts.map((b) => b.id),
    );

  return blasts.map((b) => {
    const rows = (recipients ?? []).filter((r) => r.blast_id === b.id);
    return {
      ...b,
      total: rows.length,
      sent: rows.filter((r) => r.status === "sent").length,
      failed: rows.filter((r) => r.status === "failed").length,
      skipped: rows.filter((r) => r.status === "skipped").length,
      pending: rows.filter((r) => r.status === "pending").length,
    } as TextBlastWithProgress;
  });
}
