// Pushes a CRM contact's name + number into Quo, so calls and texts
// through Quo show a name instead of a raw number. Best-effort against
// Quo's documented Contacts API - like sendQuoText, this shape hasn't
// been confirmed against a real response yet; if it errors, the response
// body is returned so the request shape can be adjusted from a real
// error instead of guessing further. A sync failure should never block
// a contact save, so every caller treats the result as informational.

import type { SupabaseClient } from "@supabase/supabase-js";
import { quoFetch } from "@/lib/quo/client";

const QUO_SOURCE = "callcaitlyn-crm";

type SyncableContact = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
};

export async function syncContactToQuo(
  admin: SupabaseClient,
  contact: SyncableContact,
): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  if (!contact.phone) return { ok: true, skipped: true };

  try {
    const lookup = await quoFetch(
      `/contacts?externalIds[]=${encodeURIComponent(contact.id)}&sources[]=${QUO_SOURCE}`,
      { method: "GET" },
    );
    const existingId = lookup.ok ? (await lookup.json())?.data?.[0]?.id ?? null : null;

    const payload = {
      defaultFields: {
        firstName: contact.first_name || undefined,
        lastName: contact.last_name || undefined,
        emails: contact.email ? [{ name: "Email", value: contact.email }] : [],
        phoneNumbers: [{ name: "Mobile", value: contact.phone }],
      },
      source: QUO_SOURCE,
      externalId: contact.id,
    };

    const res = existingId
      ? await quoFetch(`/contacts/${existingId}`, { method: "PATCH", body: JSON.stringify(payload) })
      : await quoFetch(`/contacts`, { method: "POST", body: JSON.stringify(payload) });

    if (!res.ok) {
      return { ok: false, error: `Quo contact sync failed (${res.status}): ${await res.text()}` };
    }
    await admin.from("contacts").update({ quo_synced_at: new Date().toISOString() }).eq("id", contact.id);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
