"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { applyStageChange, type DealModalMode, type PendingDealSummary } from "@/lib/crm/stage-transition";
import { DealCelebrationModal } from "@/components/contacts/DealCelebrationModal";
import { PendingDealCleanupModal } from "@/components/contacts/PendingDealCleanupModal";
import { ApproveRow } from "@/components/transcripts/ApproveRow";
import { relativeTime } from "@/lib/format-time";
import { initials } from "@/lib/utils";
import type { MeetingTranscript, ProposedChange, PipelineStage, Representing, DealSide } from "@/types/database";

const SOURCE_LABEL: Record<MeetingTranscript["source"], string> = {
  quo: "Call",
  tactiq: "Meeting",
  granola: "In-person note",
  memo: "Voice memo",
};

function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function ApprovePanel({
  transcript,
  proposals: initialProposals,
  contactId,
  contactName,
  ownerId,
  contactStageId,
  contactCreatedAt,
  representing,
  stages,
}: {
  transcript: MeetingTranscript;
  proposals: ProposedChange[];
  contactId: string;
  contactName: string;
  ownerId: string;
  contactStageId: string | null;
  contactCreatedAt: string;
  representing: Representing | null;
  stages: PipelineStage[];
}) {
  const router = useRouter();
  const [proposals, setProposals] = useState(initialProposals);
  const [dealModal, setDealModal] = useState<{ id: string; mode: DealModalMode } | null>(null);
  const [pendingCleanup, setPendingCleanup] = useState<PendingDealSummary[] | null>(null);
  const [saving, setSaving] = useState(false);

  const firstName = contactName.split(" ")[0] || contactName;
  const duration = formatDuration(transcript.duration_seconds);
  const savedNoun = transcript.source === "quo" ? "recording and transcript" : transcript.source === "memo" ? "recording" : "transcript";

  async function writeProposal(p: ProposedChange) {
    const supabase = createClient();
    const currentStage = stages.find((s) => s.id === contactStageId);

    switch (p.field) {
      case "budget": {
        const v = p.proposed_value as { min: number | null; max: number | null };
        await supabase.from("contacts").update({ budget_min: v.min, budget_max: v.max }).eq("id", contactId);
        break;
      }
      case "timeline": {
        const v = p.proposed_value as { timeline: string };
        await supabase.from("contacts").update({ timeline: v.timeline }).eq("id", contactId);
        break;
      }
      case "areas_of_interest": {
        const v = p.proposed_value as { area: string };
        const { data: c } = await supabase.from("contacts").select("areas_of_interest").eq("id", contactId).maybeSingle();
        const existing: string[] = c?.areas_of_interest ?? [];
        if (!existing.includes(v.area)) {
          await supabase.from("contacts").update({ areas_of_interest: [...existing, v.area] }).eq("id", contactId);
        }
        break;
      }
      case "decision_maker": {
        const v = p.proposed_value as { text: string };
        await supabase.from("contacts").update({ decision_maker: v.text }).eq("id", contactId);
        break;
      }
      case "objection": {
        const v = p.proposed_value as { text: string };
        await supabase.from("contacts").update({ objection: v.text }).eq("id", contactId);
        break;
      }
      case "note": {
        const v = p.proposed_value as { text: string };
        await supabase.from("activities").insert({
          owner_id: ownerId,
          contact_id: contactId,
          type: "note",
          direction: "none",
          source: "ai",
          body: v.text,
        });
        break;
      }
      case "task": {
        const v = p.proposed_value as { title: string; dueAt: string | null };
        await supabase.from("tasks").insert({ owner_id: ownerId, contact_id: contactId, title: v.title, due_at: v.dueAt });
        break;
      }
      case "stage": {
        const v = p.proposed_value as { stageId: string; stageName: string };
        const newStage = stages.find((s) => s.id === v.stageId);
        const { dealId, dealMode, pendingAtRisk } = await applyStageChange(supabase, ownerId, contactId, currentStage, newStage);
        if (dealId && dealMode) setDealModal({ id: dealId, mode: dealMode });
        if (pendingAtRisk) setPendingCleanup(pendingAtRisk);
        break;
      }
    }

    // Every accept logs one activity noting where it came from, regardless
    // of field - "Saved changes show up in his activity as 'updated from
    // the Aug 27 call.'"
    await supabase.from("activities").insert({
      owner_id: ownerId,
      contact_id: contactId,
      type: "status_change",
      direction: "none",
      source: "ai",
      body: `Updated from the ${new Date(transcript.occurred_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${SOURCE_LABEL[transcript.source].toLowerCase()}`,
    });

    await supabase.from("proposed_changes").update({ status: "accepted" }).eq("id", p.id);
  }

  async function rejectProposal(p: ProposedChange) {
    const supabase = createClient();
    await supabase.from("proposed_changes").update({ status: "rejected" }).eq("id", p.id);
  }

  function removeFromList(id: string) {
    setProposals((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleAccept(p: ProposedChange) {
    await writeProposal(p);
    removeFromList(p.id);
    router.refresh();
  }

  async function handleReject(p: ProposedChange) {
    await rejectProposal(p);
    removeFromList(p.id);
    router.refresh();
  }

  async function saveAll() {
    setSaving(true);
    for (const p of proposals) await writeProposal(p);
    setProposals([]);
    setSaving(false);
    router.refresh();
  }

  async function saveNothing() {
    setSaving(true);
    for (const p of proposals) await rejectProposal(p);
    setProposals([]);
    setSaving(false);
    router.refresh();
  }

  if (proposals.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#ebe9e7] bg-white">
      <div className="flex items-center gap-3 border-b border-neutral-100 px-[18px] py-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[15px] font-semibold text-neutral-600">
          {initials(contactName.split(" ")[0] ?? "", contactName.split(" ").slice(1).join(" "))}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-[22px] font-semibold leading-8 text-neutral-900">{contactName}</p>
          <p className="text-[15px] text-neutral-500">
            {SOURCE_LABEL[transcript.source]} {relativeTime(transcript.occurred_at)}
            {duration ? ` · ${duration}` : ""} · {savedNoun} saved
          </p>
        </div>
      </div>

      <div className="px-[18px] pt-4">
        <p className="text-lg font-semibold text-neutral-900">Here&apos;s what I heard. Keep what&apos;s right.</p>
        <p className="mt-1 text-[15px] text-neutral-600">
          Nothing is saved to {firstName}&apos;s record until you press Save. Each line quotes where it came from.
        </p>
      </div>

      <div>
        {proposals.map((p) => (
          <ApproveRow key={p.id} proposal={p} stages={stages} onAccept={handleAccept} onReject={handleReject} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 border-t border-neutral-100 px-[18px] py-4">
        <button
          type="button"
          onClick={saveAll}
          disabled={saving}
          className="rounded-[10px] bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : `Save all ${proposals.length}`}
        </button>
        <button
          type="button"
          onClick={saveNothing}
          disabled={saving}
          className="rounded-[10px] border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 disabled:opacity-50"
        >
          Save nothing
        </button>
        <span className="text-sm text-neutral-400">
          Saved changes show up in {firstName}&apos;s activity as &ldquo;updated from the{" "}
          {new Date(transcript.occurred_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} {SOURCE_LABEL[transcript.source].toLowerCase()}.&rdquo;
        </span>
      </div>

      {dealModal && (
        <DealCelebrationModal
          dealId={dealModal.id}
          contactName={contactName}
          defaultLeadStartedAt={contactCreatedAt}
          defaultSide={(representing === "buyer" || representing === "seller" ? representing : null) as DealSide | null}
          mode={dealModal.mode ?? "celebrate"}
          onClose={() => setDealModal(null)}
        />
      )}
      {pendingCleanup && <PendingDealCleanupModal deals={pendingCleanup} onClose={() => setPendingCleanup(null)} />}
    </div>
  );
}
