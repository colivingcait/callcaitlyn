import { parseFollowUpMeta } from "@/lib/crm/event-followup";
import { createClient } from "@/lib/supabase/server";

export type OpenEventFollowUp = {
  id: string;
  title: string;
  dueAt: string | null;
  eventKey: string;
  audience: string;
  contactIds: string[];
};

export async function getOpenEventFollowUp(eventKey: string): Promise<OpenEventFollowUp | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select("id, title, description, due_at, completed_at")
    .is("completed_at", null)
    .like("description", "%cc-event-followup%")
    .order("created_at", { ascending: false })
    .limit(20);

  for (const row of data ?? []) {
    const meta = parseFollowUpMeta(row.description);
    if (meta?.eventKey !== eventKey) continue;
    return {
      id: row.id,
      title: row.title,
      dueAt: row.due_at,
      eventKey: meta.eventKey,
      audience: meta.audience,
      contactIds: meta.contactIds,
    };
  }
  return null;
}
