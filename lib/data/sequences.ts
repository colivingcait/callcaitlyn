import { createClient } from "@/lib/supabase/server";
import type { EmailSequence, EmailSequenceStep, Tag } from "@/types/database";

export type SequenceWithTag = EmailSequence & { tags: Tag | null };

export async function listSequences(): Promise<SequenceWithTag[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("email_sequences").select("*, tags(*)").order("created_at", { ascending: false });
  return (data ?? []) as SequenceWithTag[];
}

export async function getSequence(id: string): Promise<SequenceWithTag | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("email_sequences").select("*, tags(*)").eq("id", id).maybeSingle();
  return data as SequenceWithTag | null;
}

export async function getSequenceSteps(sequenceId: string): Promise<EmailSequenceStep[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("email_sequence_steps")
    .select("*")
    .eq("sequence_id", sequenceId)
    .order("step_order", { ascending: true });
  return (data ?? []) as EmailSequenceStep[];
}

export type StepStats = { sent: number; opened: number; clicked: number; unsubscribed: number };

export async function getSequenceStepStats(sequenceId: string): Promise<Map<string, StepStats>> {
  const supabase = await createClient();
  const { data: sends } = await supabase
    .from("email_sequence_sends")
    .select("step_id, opened_at, clicked_at, unsubscribed_at")
    .eq("sequence_id", sequenceId);

  const byStep = new Map<string, StepStats>();
  for (const send of sends ?? []) {
    const current = byStep.get(send.step_id) ?? { sent: 0, opened: 0, clicked: 0, unsubscribed: 0 };
    current.sent += 1;
    if (send.opened_at) current.opened += 1;
    if (send.clicked_at) current.clicked += 1;
    if (send.unsubscribed_at) current.unsubscribed += 1;
    byStep.set(send.step_id, current);
  }
  return byStep;
}

export async function getSequenceEnrollmentCount(sequenceId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("email_sequence_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("sequence_id", sequenceId)
    .eq("status", "active");
  return count ?? 0;
}

export type SequenceExclusion = {
  excluded_at: string;
  contacts: { id: string; first_name: string; last_name: string; email: string | null } | null;
};

export async function getSequenceExclusions(sequenceId: string): Promise<SequenceExclusion[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("email_sequence_exclusions")
    .select("excluded_at, contacts(id, first_name, last_name, email)")
    .eq("sequence_id", sequenceId)
    .order("excluded_at", { ascending: false });
  return ((data ?? []) as unknown as SequenceExclusion[]) ?? [];
}
