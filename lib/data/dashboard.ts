import { createClient } from "@/lib/supabase/server";
import type { Activity, Contact, PipelineStage, Task } from "@/types/database";

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

export async function getDashboardData() {
  const supabase = await createClient();

  const [
    { data: stages },
    { data: contacts },
    { data: followUps },
    { data: tasks },
    { data: activities },
    { count: newLeadsWeek },
    { count: newLeadsMonth },
  ] = await Promise.all([
    supabase.from("pipeline_stages").select("*").order("sort_order", { ascending: true }),
    supabase.from("contacts").select("id, stage_id").eq("archived", false),
    supabase
      .from("contacts")
      .select("id, first_name, last_name, phone, next_follow_up_at, stage_id")
      .eq("archived", false)
      .not("next_follow_up_at", "is", null)
      .order("next_follow_up_at", { ascending: true })
      .limit(15),
    supabase
      .from("tasks")
      .select("*, contacts(first_name, last_name)")
      .is("completed_at", null)
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(10),
    supabase
      .from("activities")
      .select("*, contacts(first_name, last_name)")
      .order("occurred_at", { ascending: false })
      .limit(10),
    // Same rolling 7/30-day windows the Accountability metrics use, rather
    // than calendar week/month boundaries - keeps "this week" meaning the
    // same thing everywhere on the dashboard.
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("archived", false).gte("created_at", daysAgo(7)),
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("archived", false).gte("created_at", daysAgo(30)),
  ]);

  const stageCounts = new Map<string, number>();
  for (const c of contacts ?? []) {
    if (!c.stage_id) continue;
    stageCounts.set(c.stage_id, (stageCounts.get(c.stage_id) ?? 0) + 1);
  }

  // "Active" excludes stages marked closed (won or lost) or trash - Closed -
  // Client, Past Client, Lost / Not Now, Trash by default, but driven by the
  // flags rather than hardcoded names so it stays correct if stages are
  // renamed/added. Trash contacts are also archived on the way in, so the
  // archived=false filter above already excludes them - this is belt and
  // suspenders in case a contact's archived flag ever falls out of sync.
  const activeStageIds = new Set(
    (stages ?? []).filter((s) => !s.is_closed_won && !s.is_closed_lost && !s.is_trash).map((s) => s.id),
  );
  const totalActive = (contacts ?? []).filter((c) => c.stage_id && activeStageIds.has(c.stage_id)).length;

  return {
    stages: (stages ?? []) as PipelineStage[],
    stageCounts,
    totalActive,
    followUps: (followUps ?? []) as Partial<Contact>[],
    tasks: (tasks ?? []) as (Task & { contacts: { first_name: string; last_name: string } | null })[],
    activities: (activities ?? []) as (Activity & { contacts: { first_name: string; last_name: string } | null })[],
    newLeadsWeek: newLeadsWeek ?? 0,
    newLeadsMonth: newLeadsMonth ?? 0,
  };
}
