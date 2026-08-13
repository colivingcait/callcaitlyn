import { createClient } from "@/lib/supabase/server";
import { computeLikelihood } from "@/lib/crm/likelihood";
import { filterByQueue } from "@/lib/crm/contact-queue-filter";
import type { ContactQueue } from "@/lib/crm/contact-queues";
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

export type ContactSort =
  | "updated_desc"
  | "created_desc"
  | "created_asc"
  | "lead_date_desc"
  | "lead_date_asc"
  | "name_asc"
  | "name_desc"
  | "follow_up_asc"
  | "tag_asc"
  | "likelihood_desc";

export type ContactListFilters = {
  q?: string;
  stageId?: string;
  tagIds?: string[];
  type?: string;
  timeline?: string;
  representing?: string;
  leadSource?: string;
  hasPhone?: boolean;
  missingPhone?: boolean;
  hasEmail?: boolean;
  missingEmail?: boolean;
  hasFollowUp?: boolean;
  missingFollowUp?: boolean;
  overdueFollowUp?: boolean;
  archived?: "active" | "archived" | "all";
  hasNotes?: boolean;
  missingNotes?: boolean;
  birthdayMonth?: number;
  city?: string;
  state?: string;
  minBudget?: number;
  notSyncedQuo?: boolean;
  eventName?: string;
  likelihood?: "high" | "medium" | "low";
  queue?: ContactQueue;
  // Drill-down from the dashboard's New Leads tile - contacts whose
  // lead_date falls within the last N days, not created_at (see lead_date's
  // comment in the migration for why those can differ).
  leadDateWithinDays?: number;
  leadDateFrom?: string;
  leadDateTo?: string;
  sort?: ContactSort;
};

export async function listContacts(filters: ContactListFilters) {
  const supabase = await createClient();
  let query = supabase.from("contacts").select("*, pipeline_stages(*), contact_tags(tags(*))");

  if (filters.archived === "archived") query = query.eq("archived", true);
  else if (filters.archived === "all") {
    /* no archived filter at all */
  } else query = query.eq("archived", false);

  if (filters.stageId) query = query.eq("stage_id", filters.stageId);
  if (filters.type) query = query.eq("contact_type", filters.type);
  if (filters.timeline) query = query.eq("timeline", filters.timeline);
  if (filters.representing) query = query.eq("representing", filters.representing);
  if (filters.leadSource) query = query.eq("lead_source", filters.leadSource);
  if (filters.hasPhone) query = query.not("phone", "is", null);
  if (filters.missingPhone) query = query.is("phone", null);
  if (filters.hasEmail) query = query.not("email", "is", null);
  if (filters.missingEmail) query = query.is("email", null);
  if (filters.hasFollowUp) query = query.not("next_follow_up_at", "is", null);
  if (filters.missingFollowUp) query = query.is("next_follow_up_at", null);
  if (filters.overdueFollowUp) query = query.not("next_follow_up_at", "is", null).lt("next_follow_up_at", new Date().toISOString());
  if (filters.city) query = query.ilike("city", `%${filters.city}%`);
  if (filters.state) query = query.ilike("state", `%${filters.state}%`);
  if (filters.minBudget) query = query.gte("budget_max", filters.minBudget);
  if (filters.notSyncedQuo) query = query.is("quo_synced_at", null);
  if (filters.eventName) query = query.eq("last_event_name", filters.eventName);
  if (filters.leadDateWithinDays) {
    query = query.gte("lead_date", new Date(Date.now() - filters.leadDateWithinDays * 24 * 60 * 60 * 1000).toISOString());
  }
  if (filters.leadDateFrom) query = query.gte("lead_date", filters.leadDateFrom);
  if (filters.leadDateTo) query = query.lte("lead_date", filters.leadDateTo);
  if (filters.q) {
    const q = filters.q.trim();
    query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  }

  // Tag, name, follow-up, and likelihood sorts need the joined data (or a
  // computed value) in hand first, so those are sorted in JS after the
  // fetch instead of in the query.
  const sort = filters.sort ?? "updated_desc";
  const jsSort = new Set<ContactSort>(["name_asc", "name_desc", "follow_up_asc", "tag_asc", "likelihood_desc"]);
  if (sort === "created_desc") query = query.order("created_at", { ascending: false });
  else if (sort === "created_asc") query = query.order("created_at", { ascending: true });
  else if (sort === "lead_date_desc") query = query.order("lead_date", { ascending: false });
  else if (sort === "lead_date_asc") query = query.order("lead_date", { ascending: true });
  else if (!jsSort.has(sort)) query = query.order("updated_at", { ascending: false });

  const { data } = await query;
  let contacts = (data ?? []) as ContactWithRelations[];

  if (filters.tagIds?.length) {
    const tagIds = filters.tagIds;
    contacts = contacts.filter((c) => c.contact_tags.some((ct) => tagIds.includes(ct.tags.id)));
  }

  if (filters.hasNotes) contacts = contacts.filter((c) => !!c.notes?.trim());
  if (filters.missingNotes) contacts = contacts.filter((c) => !c.notes?.trim());
  if (filters.birthdayMonth) {
    contacts = contacts.filter((c) => !!c.birthday && new Date(c.birthday).getUTCMonth() + 1 === filters.birthdayMonth);
  }

  // Likelihood and the "queue" working lists both need the full stage set
  // to compute against, so only fetch it when one of those is actually in
  // play - the common case (no likelihood/queue filter) skips this entirely.
  if (filters.likelihood || filters.queue) {
    const stages = await listStages();
    if (filters.likelihood) {
      contacts = contacts.filter((c) => computeLikelihood(c, stages) === filters.likelihood);
    }
    if (filters.queue) {
      contacts = await filterByQueue(contacts, filters.queue, stages);
    }
  }

  if (sort === "name_asc") {
    contacts = [...contacts].sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`));
  } else if (sort === "name_desc") {
    contacts = [...contacts].sort((a, b) => `${b.first_name} ${b.last_name}`.localeCompare(`${a.first_name} ${a.last_name}`));
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
  } else if (sort === "likelihood_desc") {
    const stages = await listStages();
    const rank = { high: 2, medium: 1, low: 0 } as const;
    contacts = [...contacts].sort((a, b) => {
      const la = computeLikelihood(a, stages);
      const lb = computeLikelihood(b, stages);
      return (lb ? rank[lb] : -1) - (la ? rank[la] : -1);
    });
  }

  return contacts;
}

// Populates the "Last event attended" filter dropdown with whatever event
// names actually exist on real contacts (from Jotform check-ins), same
// pattern as listLeadSources below.
export async function listLastEventNames() {
  const supabase = await createClient();
  const { data } = await supabase.from("contacts").select("last_event_name").eq("archived", false).not("last_event_name", "is", null);
  const values = new Set((data ?? []).map((c) => c.last_event_name as string).filter((s) => s.trim().length > 0));
  return [...values].sort((a, b) => a.localeCompare(b));
}

// lead_source is free text (not FK'd to a lookup table - see ContactForm's
// LEAD_SOURCES suggestion list), so "distinct values" has to be computed
// here rather than via a join. Used to populate the source filter dropdown
// with whatever values actually exist on real contacts, including ones
// typed in by hand or brought in via CSV import that aren't in the
// suggestion list.
export async function listLeadSources() {
  const supabase = await createClient();
  const { data } = await supabase.from("contacts").select("lead_source").eq("archived", false).not("lead_source", "is", null);
  const values = new Set((data ?? []).map((c) => c.lead_source as string).filter((s) => s.trim().length > 0));
  return [...values].sort((a, b) => a.localeCompare(b));
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
