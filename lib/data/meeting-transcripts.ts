import { createClient } from "@/lib/supabase/server";
import type { MeetingTranscript, ProposedChange } from "@/types/database";

export async function getTranscriptWithProposals(
  transcriptId: string,
): Promise<{ transcript: MeetingTranscript; proposals: ProposedChange[] } | null> {
  const supabase = await createClient();

  const [{ data: transcript }, { data: proposals }] = await Promise.all([
    supabase.from("meeting_transcripts").select("*").eq("id", transcriptId).maybeSingle(),
    supabase.from("proposed_changes").select("*").eq("transcript_id", transcriptId).eq("status", "pending").order("created_at", { ascending: true }),
  ]);

  if (!transcript) return null;
  return { transcript: transcript as MeetingTranscript, proposals: (proposals ?? []) as ProposedChange[] };
}

// Most recent ready transcript for a contact that still has pending
// proposals - the contact page shows at most one panel at a time, the
// freshest one worth reviewing.
export async function getLatestReadyTranscriptForContact(
  contactId: string,
): Promise<{ transcript: MeetingTranscript; proposals: ProposedChange[] } | null> {
  const supabase = await createClient();

  const { data: transcripts } = await supabase
    .from("meeting_transcripts")
    .select("id")
    .eq("contact_id", contactId)
    .eq("status", "ready")
    .order("occurred_at", { ascending: false })
    .limit(5);

  for (const t of transcripts ?? []) {
    const result = await getTranscriptWithProposals(t.id);
    if (result && result.proposals.length > 0) return result;
  }
  return null;
}
