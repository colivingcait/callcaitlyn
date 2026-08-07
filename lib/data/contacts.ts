import { createClient } from "@/lib/supabase/server";
import type { Activity, AiInsight, ContactWithRelations, PipelineStage, Tag, Task } from "@/types/database";

export async function listStages() {
  const supabase = await createClient();
  const { data } = await supabase.from("pipeline_stages").select("*").order("sort_order", { ascending: true });
  return (data ?? []) as PipelineStage[];
}

export async function listTags() {
  const supabase = await createClient();
  const { data } = await supabase.from("tags").select("*").order("name", { ascending: true });
  return (data ?? []) as Tag[];
}

export async function listContacts(filters: { q?: string; stageId?: string; tagId?: string; type?: string }) {
  const supabase = await createClient();
  let query = supabase
    .from("contacts")
    .select("*, pipeline_stages(*), contact_tags(tags(*))")
    .eq("archived", false)
    .order("updated_at", { ascending: false });

  if (filters.stageId) query = query.eq("stage_id", filters.stageId);
  if (filters.type) query = query.eq("contact_type", filters.type);
  if (filters.q) {
    const q = filters.q.trim();
    query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  }

  const { data } = await query;
  let contacts = (data ?? []) as ContactWithRelations[];

  if (filters.tagId) {
    contacts = contacts.filter((c) => c.contact_tags.some((ct) => ct.tags.id === filters.tagId));
  }

  return contacts;
}

export async function getContact(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contacts")
    .select("*, pipeline_stages(*), contact_tags(tags(*))")
    .eq("id", id)
    .single();
  return data as ContactWithRelations | null;
}

export async function getContactActivities(contactId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activities")
    .select("*")
    .eq("contact_id", contactId)
    .order("occurred_at", { ascending: false });
  return (data ?? []) as Activity[];
}

export async function getContactInsights(contactId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_insights")
    .select("*")
    .eq("contact_id", contactId)
    .eq("dismissed", false)
    .order("created_at", { ascending: false });
  return (data ?? []) as AiInsight[];
}

export async function getContactTasks(contactId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select("*")
    .eq("contact_id", contactId)
    .order("completed_at", { ascending: true, nullsFirst: true })
    .order("due_at", { ascending: true, nullsFirst: false });
  return (data ?? []) as Task[];
}
