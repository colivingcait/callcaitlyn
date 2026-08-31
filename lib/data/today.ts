import { isPast } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { relativeTime, isTodayLocal } from "@/lib/format-time";
import { filterByQueue } from "@/lib/crm/contact-queue-filter";
import { listContacts } from "@/lib/data/contacts";
import { listNewRegistrationsQueue } from "@/lib/data/dialer";
import { listWonDeals, listPendingDeals } from "@/lib/data/commissions";
import { computeDeals, summarizeDeals, capYearKey, capYearStart, KW_CAP } from "@/lib/crm/commission";
import type { AiInsight, PipelineStage, Representing } from "@/types/database";

export type WorklistPerson = { id: string; name: string; phone: string | null; meta: string; late: boolean };

// "Calls" - contacts.next_follow_up_at due or overdue, or a missed call
// logged. The overdue/today math previously lived inside FollowUpList
// (client component) - moved here so the group's red "N late" count and
// each row's own late styling can only ever agree with each other.
async function getCallsGroup(): Promise<WorklistPerson[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, phone, next_follow_up_at")
    .eq("archived", false)
    .not("next_follow_up_at", "is", null)
    .order("next_follow_up_at", { ascending: true })
    .limit(30);

  return (data ?? []).map((c) => {
    const due = new Date(c.next_follow_up_at as string);
    const today = isTodayLocal(c.next_follow_up_at as string);
    const overdue = isPast(due) && !today;
    const meta = overdue ? `${relativeTime(due)} · follow-up` : today ? "Due today" : `Due ${relativeTime(due)}`;
    return { id: c.id, name: `${c.first_name} ${c.last_name}`.trim(), phone: c.phone, meta, late: overdue };
  });
}

// "Replies owed" - last inbound text on a thread with no outbound after
// it. Nothing in the app reads activities.direction in bulk today; this
// is a new aggregation, same shape as contact-queue-filter's
// fetchActivityAggregates (one unscoped-ish select, reduce in JS).
async function getRepliesOwedGroup(): Promise<WorklistPerson[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activities")
    .select("contact_id, direction, occurred_at, body, contacts!inner(id, first_name, last_name, phone, archived)")
    .eq("type", "text")
    .eq("contacts.archived", false)
    .order("occurred_at", { ascending: false })
    .limit(1000);

  const seen = new Set<string>();
  const owed: WorklistPerson[] = [];
  for (const row of data ?? []) {
    const contact = row.contacts as unknown as { id: string; first_name: string; last_name: string; phone: string | null } | null;
    if (!contact || seen.has(contact.id)) continue;
    seen.add(contact.id);
    if (row.direction !== "inbound") continue;
    const preview = row.body ? `"${row.body.slice(0, 60)}${row.body.length > 60 ? "…" : ""}"` : "Texted you";
    owed.push({
      id: contact.id,
      name: `${contact.first_name} ${contact.last_name}`.trim(),
      phone: contact.phone,
      meta: `${preview} · ${relativeTime(row.occurred_at)}`,
      late: false,
    });
  }
  return owed;
}

export type WorklistTask = { id: string; title: string; dueAt: string | null; contactId: string | null; contactName: string | null; late: boolean };

async function getMyTasksGroup(): Promise<WorklistTask[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select("id, title, due_at, contact_id, contacts(first_name, last_name)")
    .is("completed_at", null)
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(30);

  return (data ?? []).map((t) => {
    const contact = t.contacts as unknown as { first_name: string; last_name: string } | null;
    const late = t.due_at ? isPast(new Date(t.due_at)) && !isTodayLocal(t.due_at) : false;
    return {
      id: t.id,
      title: t.title,
      dueAt: t.due_at,
      contactId: t.contact_id,
      contactName: contact ? `${contact.first_name} ${contact.last_name}`.trim() : null,
      late,
    };
  });
}

async function getRegisteredNoFollowUpGroup(stages: PipelineStage[]): Promise<WorklistPerson[]> {
  const contacts = await listContacts({});
  const matched = await filterByQueue(contacts, "no_followup_after_registration", stages);
  return matched.slice(0, 20).map((c) => ({
    id: c.id,
    name: `${c.first_name} ${c.last_name}`.trim(),
    phone: c.phone,
    meta: c.last_event_name ? `Registered · ${c.last_event_name}` : "Registered, no follow-up yet",
    late: false,
  }));
}

// "Just finished" - ready transcripts from the last 48 hours that still
// have pending proposals to review. Today only lists these (name, source,
// how many proposals) and links to the contact page, which is where the
// actual ApprovePanel renders - keeps this query light (no need to also
// pull every contact's stage/representing/etc just to list who has
// something to review).
async function getJustFinishedGroup(): Promise<WorklistPerson[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("meeting_transcripts")
    .select("id, source, occurred_at, contacts!inner(id, first_name, last_name, phone, archived)")
    .eq("status", "ready")
    .eq("contacts.archived", false)
    .gte("occurred_at", daysAgo(2))
    .order("occurred_at", { ascending: false })
    .limit(20);

  if (!data || data.length === 0) return [];

  const { data: pendingCounts } = await supabase
    .from("proposed_changes")
    .select("transcript_id")
    .eq("status", "pending")
    .in(
      "transcript_id",
      data.map((t) => t.id),
    );
  const countByTranscript = new Map<string, number>();
  for (const row of pendingCounts ?? []) {
    countByTranscript.set(row.transcript_id, (countByTranscript.get(row.transcript_id) ?? 0) + 1);
  }

  const SOURCE_LABEL: Record<string, string> = { quo: "Call", tactiq: "Meeting", granola: "Note", memo: "Voice memo" };
  const seen = new Set<string>();
  const justFinished: WorklistPerson[] = [];
  for (const row of data) {
    const contact = row.contacts as unknown as { id: string; first_name: string; last_name: string; phone: string | null } | null;
    if (!contact || seen.has(contact.id)) continue;
    const count = countByTranscript.get(row.id) ?? 0;
    if (count === 0) continue;
    seen.add(contact.id);
    justFinished.push({
      id: contact.id,
      name: `${contact.first_name} ${contact.last_name}`.trim(),
      phone: contact.phone,
      meta: `${SOURCE_LABEL[row.source] ?? row.source} ${relativeTime(row.occurred_at)} · ${count} thing${count === 1 ? "" : "s"} to review`,
      late: false,
    });
  }
  return justFinished;
}

export type SuggestedInsight = {
  insight: AiInsight;
  contactId: string;
  contactName: string;
  contactStageId: string | null;
  contactCreatedAt: string;
  representing: Representing | null;
};

async function getSuggestedInsights(): Promise<SuggestedInsight[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_insights")
    .select("*, contacts!inner(id, first_name, last_name, stage_id, created_at, representing, archived)")
    .eq("dismissed", false)
    .eq("contacts.archived", false)
    .order("created_at", { ascending: false })
    .limit(10);

  return (data ?? []).map((row) => {
    const { contacts, ...insight } = row as unknown as AiInsight & {
      contacts: { id: string; first_name: string; last_name: string; stage_id: string | null; created_at: string; representing: Representing | null };
    };
    return {
      insight: insight as AiInsight,
      contactId: contacts.id,
      contactName: `${contacts.first_name} ${contacts.last_name}`.trim(),
      contactStageId: contacts.stage_id,
      contactCreatedAt: contacts.created_at,
      representing: contacts.representing,
    };
  });
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

async function getStatStrip(stages: PipelineStage[]) {
  const supabase = await createClient();
  const [{ data: contacts }, { count: newLeadsWeek }] = await Promise.all([
    supabase.from("contacts").select("id, stage_id").eq("archived", false),
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("archived", false).gte("lead_date", daysAgo(7)),
  ]);

  const stageCounts = new Map<string, number>();
  for (const c of contacts ?? []) {
    if (!c.stage_id) continue;
    stageCounts.set(c.stage_id, (stageCounts.get(c.stage_id) ?? 0) + 1);
  }
  const activeStageIds = new Set(stages.filter((s) => !s.is_closed_won && !s.is_closed_lost && !s.is_trash).map((s) => s.id));
  const totalActive = (contacts ?? []).filter((c) => c.stage_id && activeStageIds.has(c.stage_id)).length;
  const hotStage = stages.find((s) => s.name.toLowerCase().includes("hot"));
  const hotCount = hotStage ? stageCounts.get(hotStage.id) ?? 0 : 0;
  const underContractStage = stages.find((s) => s.is_under_contract);
  const underContractCount = underContractStage ? stageCounts.get(underContractStage.id) ?? 0 : 0;

  return { totalActive, newLeadsWeek: newLeadsWeek ?? 0, hotCount, underContractCount, stageCounts };
}

async function getCommissionYearSummary() {
  const [won, pending] = await Promise.all([listWonDeals(), listPendingDeals()]);
  const currentKey = capYearKey(new Date());
  const yearStart = capYearStart(new Date());
  const wonThisYear = computeDeals(won.filter((d) => capYearKey(new Date(d.closed_at)) === currentKey));
  const pendingThisYear = computeDeals(pending.filter((d) => new Date(d.closed_at) >= yearStart));
  const stats = summarizeDeals(wonThisYear);
  const kwCapLeft = Math.max(KW_CAP - stats.totalKW, 0);
  const pendingNet = pendingThisYear.reduce((sum, d) => sum + d.netCommission, 0);

  return {
    netCommission: stats.netCommissionIncome,
    underContractNet: pendingNet,
    kwCapLeft,
    kwCapUsedPct: Math.min(100, Math.round(((KW_CAP - kwCapLeft) / KW_CAP) * 100)),
  };
}

export async function getTodayData() {
  const supabase = await createClient();
  const { data: stagesData } = await supabase.from("pipeline_stages").select("*").order("sort_order", { ascending: true });
  const stages = (stagesData ?? []) as PipelineStage[];

  const [calls, repliesOwed, myTasks, registeredNoFollowUp, suggested, justFinished, statStrip, commissionYear, newLeads] = await Promise.all([
    getCallsGroup(),
    getRepliesOwedGroup(),
    getMyTasksGroup(),
    getRegisteredNoFollowUpGroup(stages),
    getSuggestedInsights(),
    getJustFinishedGroup(),
    getStatStrip(stages),
    getCommissionYearSummary(),
    listNewRegistrationsQueue(),
  ]);

  return {
    stages,
    calls,
    repliesOwed,
    myTasks,
    registeredNoFollowUp,
    suggested,
    justFinished,
    statStrip,
    commissionYear,
    newLeadsNeverCalled: newLeads.contacts.length,
  };
}
