import type { SupabaseClient } from "@supabase/supabase-js";
import { addTagByName } from "./find-or-create-contact";

// "Engaged" = multiple calls/texts (either direction) in the trailing 7
// days - recomputed right after logging each new call/text rather than on
// a schedule, since the app is already event-driven off Quo webhooks and
// this avoids needing a cron job for something this lightweight.
const ENGAGEMENT_WINDOW_DAYS = 7;
const ENGAGEMENT_THRESHOLD = 3;
const ENGAGED_TAG = "Engaged";

export async function updateEngagementTag(admin: SupabaseClient, ownerId: string, contactId: string) {
  const since = new Date(Date.now() - ENGAGEMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { count } = await admin
    .from("activities")
    .select("id", { count: "exact", head: true })
    .eq("contact_id", contactId)
    .in("type", ["call", "text"])
    .gte("occurred_at", since);

  const engaged = (count ?? 0) >= ENGAGEMENT_THRESHOLD;

  if (engaged) {
    await addTagByName(admin, ownerId, contactId, ENGAGED_TAG);
    return;
  }

  const { data: tag } = await admin.from("tags").select("id").eq("owner_id", ownerId).eq("name", ENGAGED_TAG).maybeSingle();
  if (tag) {
    await admin.from("contact_tags").delete().eq("contact_id", contactId).eq("tag_id", tag.id);
  }
}
