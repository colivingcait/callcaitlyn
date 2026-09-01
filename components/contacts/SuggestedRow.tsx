"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TIMELINE_LABELS } from "@/lib/utils";
import { applyStageChange, type DealModalMode, type PendingDealSummary } from "@/lib/crm/stage-transition";
import { DealCelebrationModal } from "@/components/contacts/DealCelebrationModal";
import { PendingDealCleanupModal } from "@/components/contacts/PendingDealCleanupModal";
import type { AiInsight, DealSide, PipelineStage, Representing, Tag } from "@/types/database";

// Row-shaped AI-insight display, replacing AiInsightCard's standalone
// card shape - used both on a contact's own Suggested card (one insight,
// contact implicit) and Today's Suggested tray (several insights across
// contacts, contact name shown via showContactName). Same
// apply/dismiss logic either place, just the one component so the two
// screens can't drift into different treatments.
export function SuggestedRow({
  insight,
  contactId,
  ownerId,
  contactStageId,
  contactName,
  contactCreatedAt,
  representing,
  stages,
  tags,
  showContactName = false,
}: {
  insight: AiInsight;
  contactId: string;
  ownerId: string;
  contactStageId: string | null;
  contactName: string;
  contactCreatedAt: string;
  representing: Representing | null;
  stages: PipelineStage[];
  tags: Tag[];
  showContactName?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [dealModal, setDealModal] = useState<{ id: string; mode: DealModalMode } | null>(null);
  const [pendingCleanup, setPendingCleanup] = useState<PendingDealSummary[] | null>(null);

  const suggestedStage = stages.find((s) => s.id === insight.suggested_stage_id);
  const currentStage = stages.find((s) => s.id === contactStageId);
  const suggestedTags = (insight.suggested_tag_ids ?? []).map((id) => tags.find((t) => t.id === id)).filter((t): t is Tag => Boolean(t));
  const hasStageOrTimeline = !!suggestedStage || !!insight.suggested_timeline;
  const hasApplyTarget = hasStageOrTimeline || suggestedTags.length > 0;

  async function handleDismiss() {
    setBusy(true);
    const supabase = createClient();
    await supabase.from("ai_insights").update({ dismissed: true }).eq("id", insight.id);
    router.refresh();
  }

  async function handleApply() {
    setBusy(true);
    const supabase = createClient();

    if (suggestedStage) {
      const { dealId, dealMode, pendingAtRisk } = await applyStageChange(supabase, ownerId, contactId, currentStage, suggestedStage);
      if (dealId && dealMode) setDealModal({ id: dealId, mode: dealMode });
      if (pendingAtRisk) setPendingCleanup(pendingAtRisk);
    }
    if (insight.suggested_timeline) {
      await supabase.from("contacts").update({ timeline: insight.suggested_timeline }).eq("id", contactId);
    }
    if (suggestedTags.length > 0) {
      await supabase
        .from("contact_tags")
        .upsert(
          suggestedTags.map((t) => ({ contact_id: contactId, tag_id: t.id })),
          { onConflict: "contact_id,tag_id", ignoreDuplicates: true },
        );
    }

    await supabase.from("activities").insert({
      owner_id: ownerId,
      contact_id: contactId,
      type: "status_change",
      direction: "none",
      source: "ai",
      body: `AI-suggested update applied: ${insight.summary}`,
    });

    await supabase.from("ai_insights").update({ dismissed: true, applied: true }).eq("id", insight.id);
    setBusy(false);
    router.refresh();
  }

  // For a plain suggested_action (no stage/timeline attached) - "Add to
  // list" turns it into a task rather than mutating the contact directly,
  // since there's nothing concrete to apply, just something worth doing.
  async function handleAddToList() {
    setBusy(true);
    const supabase = createClient();
    await supabase.from("tasks").insert({
      owner_id: ownerId,
      contact_id: contactId,
      title: insight.suggested_action,
      due_at: new Date().toISOString(),
    });
    await supabase.from("ai_insights").update({ dismissed: true }).eq("id", insight.id);
    setBusy(false);
    router.refresh();
  }

  const suggestionLine = [
    suggestedStage ? `Move to ${suggestedStage.name}` : null,
    insight.suggested_timeline ? `Timeline: ${TIMELINE_LABELS[insight.suggested_timeline]}` : null,
    suggestedTags.length > 0 ? `Tag: ${suggestedTags.map((t) => t.name).join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex items-center gap-3.5 border-b border-neutral-100 px-4 py-3.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold leading-6 text-neutral-900">{insight.summary}</p>
        <p className="mt-0.5 text-sm text-neutral-500">
          {showContactName && <span className="font-medium text-neutral-600">{contactName} · </span>}
          {suggestionLine || insight.suggested_action}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {hasApplyTarget ? (
          <button
            onClick={handleApply}
            disabled={busy}
            className="whitespace-nowrap rounded-[10px] border border-neutral-200 bg-white px-3.5 py-2 text-sm font-semibold text-neutral-800 disabled:opacity-50"
          >
            Apply
          </button>
        ) : insight.suggested_action ? (
          <button
            onClick={handleAddToList}
            disabled={busy}
            className="whitespace-nowrap rounded-[10px] border border-neutral-200 bg-white px-3.5 py-2 text-sm font-semibold text-neutral-800 disabled:opacity-50"
          >
            Add to list
          </button>
        ) : null}
        <button onClick={handleDismiss} disabled={busy} className="rounded-[10px] border border-neutral-200 bg-white p-2 text-neutral-500 disabled:opacity-50">
          <X size={14} />
        </button>
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
