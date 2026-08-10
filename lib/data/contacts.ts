import { createClient } from "@/lib/supabase/server";
import type { Activity, AiInsight, ContactSegment, ContactWithRelations, Deal, PipelineStage, Tag, Task } from "@/types/database";

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

export type MergeCandidate = { id: string; first_name: string; last_name: string; phone: string | null; email: string | null };

// Lightweight list for the "merge into…" picker - every non-archived
// contact, not just the current filtered view, so a duplicate can be
// merged into its match regardless of what filters happen to be active.
export async function listMergeCandidates(): Promise<MergeCandidate[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, phone, email")
    .eq("archived", false)
    .order("first_name", { ascending: true });
  return (data ?? []) as MergeCandidate[];
}

export type ContactSort = "updated_desc" | "created_desc" | "name_asc" | "follow_up_asc" | "tag_asc";

export async function listContacts(filters: {
  q?: string;
  stageId?: string;
  tagId?: string;
  type?: string;
  timeline?: string;
  representing?: string;
  hasPhone?: boolean;
  sort?: ContactSort;
}) {
  const supabase = await createClient();
  let query = supabase.from("contacts").select("*, pipeline_stages(*), contact_tags(tags(*))").eq("archived", false);

  if (filters.stageId) query = query.eq("stage_id", filters.stageId);
  if (filters.type) query = query.eq("contact_type", filters.type);
  if (filters.timeline) query = query.eq("timeline", filters.timeline);
  if (filters.representing) query = query.eq("representing", filters.representing);
  if (filters.hasPhone) query = query.not("phone", "is", null);
  if (filters.q) {
    const q = filters.q.trim();
    query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  }

  // Tag and name/follow-up sorts need the joined data in hand first (a tag
  // is an array relation, and name is split across two columns), so those
  // are sorted in JS after the fetch instead of in the query.
  const sort = filters.sort ?? "updated_desc";
  if (sort === "created_desc") query = query.order("created_at", { ascending: false });
  else if (sort !== "name_asc" && sort !== "follow_up_asc" && sort !== "tag_asc") query = query.order("updated_at", { ascending: false });

  const { data } = await query;
  let contacts = (data ?? []) as ContactWithRelations[];

  if (filters.tagId) {
    contacts = contacts.filter((c) => c.contact_tags.some((ct) => ct.tags.id === filters.tagId));
  }

  if (sort === "name_asc") {
    contacts = [...contacts].sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`));
  } else if (sort === "follow_up_asc") {
    contacts = [...contacts].sort((a, b) => {
      if (!a.next_follow_up_at && !b.next_follow_up_at) return 0;
      if (!a.next_follow_up_at) return 1;
      if (!b.next_follow_up_at) return -1;
      return new Date(a.next_follow_up_at).getTime() - new Date(b.next_follow_up_at).getTime();
    });
  } else if (sort === "tag_asc") {
    contacts = [...contacts].sort((a, b) => {
      const tagA = [...a.contact_tags].sort((x, y) => x.tags.name.localeCompare(y.tags.name))[0]?.tags.name;
      const tagB = [...b.contact_tags].sort((x, y) => x.tags.name.localeCompare(y.tags.name))[0]?.tags.name;
      if (!tagA && !tagB) return 0;
      if (!tagA) return 1;
      if (!tagB) return -1;
      return tagA.localeCompare(tagB);
    });
  }

  return contacts;
}

export async function listSegments() {
  const supabase = await createClient();
  const { data } = await supabase.from("contact_segments").select("*").order("created_at", { ascending: true });
  return (data ?? []) as ContactSegment[];
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

export async function getContactDeals(contactId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("deals")
    .select("*")
    .eq("contact_id", contactId)
    .order("closed_at", { ascending: false });
  return (data ?? []) as Deal[];
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
