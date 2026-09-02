import type { SupabaseClient } from "@supabase/supabase-js";
import { findOrCreateContact, addTagByName } from "@/lib/crm/find-or-create-contact";
import { upsertActivity } from "@/lib/crm/activities";
import { notifyNewLead } from "@/lib/push/send-push";

// Shared by both ways a Blinq share can reach this CRM: the Zapier
// webhook (Blinq Business only) and parsing Blinq's own free-tier "X has
// sent you their details" notification email straight out of the Gmail
// sync (lib/google/parse-blinq-email.ts) - same downstream effect either
// way, just a different trigger.
export async function recordBlinqContact(
  admin: SupabaseClient,
  ownerId: string,
  input: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    company?: string | null;
    jobTitle?: string | null;
    dedupeId: string | null;
  },
): Promise<void> {
  if (!input.email && !input.phone) return;

  const contact = await findOrCreateContact(admin, ownerId, {
    email: input.email,
    phone: input.phone,
    firstName: input.firstName,
    lastName: input.lastName,
    leadSource: "Blinq",
  });
  if (!contact) return;

  await addTagByName(admin, ownerId, contact.id, "Blinq");

  const details = [input.company, input.jobTitle].filter(Boolean).join(" · ");
  await upsertActivity(admin, ownerId, contact.id, "blinq", "blinq_contact_id", input.dedupeId, {
    type: "note",
    direction: "none",
    occurred_at: new Date().toISOString(),
    body: details ? `Shared a Blinq digital business card - ${details}` : "Shared a Blinq digital business card",
    metadata: { company: input.company ?? null, job_title: input.jobTitle ?? null },
  });

  if (contact.wasCreated) {
    await notifyNewLead(admin, ownerId, {
      title: "New contact via Blinq",
      body: `${input.firstName ?? input.email ?? input.phone} shared their digital business card`,
      url: `/contacts/${contact.id}`,
    });
  }
}
