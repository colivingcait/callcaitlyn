"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Badge } from "@/components/ui";
import { Sparkles, Check, X } from "lucide-react";
import { TIMELINE_LABELS } from "@/lib/utils";
import { applyStageChange, type DealModalMode, type PendingDealSummary } from "@/lib/crm/stage-transition";
import { DealCelebrationModal } from "@/components/contacts/DealCelebrationModal";
import { PendingDealCleanupModal } from "@/components/contacts/PendingDealCleanupModal";
import type { AiInsight, DealSide, PipelineStage, Representing } from "@/types/database";

export function AiInsightCard({
  insight,
  contactId,
  ownerId,
  contactStageId,
  contactName,
  contactCreatedAt,
  representing,
  stages,
}: {
  insight: AiInsight;
  contactId: string;
  ownerId: string;
  contactStageId: string | null;
  contactName: string;
  contactCreatedAt: string;
  representing: Representing | null;
  stages: PipelineStage[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dealModal, setDealModal] = useState<{ id: string; mode: DealModalMode } | null>(null);
  const [pendingCleanup, setPendingCleanup] = useState<PendingDealSummary[] | null>(null);

  const suggestedStage = stages.find((s) => s.id === insight.suggested_stage_id);
  const currentStage = stages.find((s) => s.id === contactStageId);
  const hasSuggestion = !!suggestedStage || !!insight.suggested_timeline;

  async function handleDismiss() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: dismissError } = await supabase.from("ai_insights").update({ dismissed: true }).eq("id", insight.id);
    setBusy(false);
    if (dismissError) {
      setError(dismissError.message);
      return;
    }
    router.refresh();
  }

  // Every write below used to fire without checking its result, so a
  // denied/failed write still marked the insight dismissed+applied with
  // nothing actually changed on the contact - the same bug found in
  // ApprovePanel's proposed-changes flow. Now the first failure stops
  // before the insight is marked applied, and the card shows the real
  // error instead of quietly disappearing.
  async function handleApply() {
    setBusy(true);
    setError(null);
    const supabase = createClient();

    if (suggestedStage) {
      const { error: stageError, dealId, dealMode, pendingAtRisk } = await applyStageChange(supabase, ownerId, contactId, currentStage, suggestedStage);
      if (stageError) {
        setBusy(false);
        setError(stageError.message);
        return;
      }
      if (dealId && dealMode) setDealModal({ id: dealId, mode: dealMode });
      if (pendingAtRisk) setPendingCleanup(pendingAtRisk);
    }
    if (insight.suggested_timeline) {
      const { error: timelineError } = await supabase.from("contacts").update({ timeline: insight.suggested_timeline }).eq("id", contactId);
      if (timelineError) {
        setBusy(false);
        setError(timelineError.message);
        return;
      }
    }

    if (hasSuggestion) {
      const { error: activityError } = await supabase.from("activities").insert({
        owner_id: ownerId,
        contact_id: contactId,
        type: "status_change",
        direction: "none",
        source: "ai",
        body: `AI-suggested update applied: ${insight.summary}`,
      });
      if (activityError) {
        setBusy(false);
        setError(activityError.message);
        return;
      }
    }

    const { error: markError } = await supabase.from("ai_insights").update({ dismissed: true, applied: true }).eq("id", insight.id);
    setBusy(false);
    if (markError) {
      setError(markError.message);
      return;
    }
    router.refresh();
  }

  return (
    <Card className="space-y-3 border-brand-100 bg-brand-50/40">
      <div className="flex items-start gap-2">
        <Sparkles size={16} className="mt-0.5 shrink-0 text-brand-600" />
        <p className="min-w-0 break-words text-sm text-neutral-800">{insight.summary}</p>
      </div>

      {(suggestedStage || insight.suggested_timeline) && (
        <div className="flex flex-wrap gap-2">
          {suggestedStage && (
            <Badge color={suggestedStage.color}>Move to {suggestedStage.name}</Badge>
          )}
          {insight.suggested_timeline && (
            <Badge className="bg-neutral-100 text-neutral-600">
              Timeline: {TIMELINE_LABELS[insight.suggested_timeline]}
            </Badge>
          )}
        </div>
      )}

      {insight.suggested_action && !hasSuggestion && (
        <p className="text-sm text-neutral-600">
          <span className="font-medium text-neutral-700">Suggested: </span>
          {insight.suggested_action}
        </p>
      )}

      {error && <p className="text-sm text-red-600">Couldn&apos;t apply: {error}</p>}

      <div className="flex gap-2">
        {hasSuggestion && (
          <Button size="sm" disabled={busy} onClick={handleApply}>
            <Check size={14} /> Apply
          </Button>
        )}
        <Button size="sm" variant="ghost" disabled={busy} onClick={handleDismiss}>
          <X size={14} /> Dismiss
        </Button>
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
    </Card>
  );
}
