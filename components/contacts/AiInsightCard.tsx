"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Badge } from "@/components/ui";
import { Sparkles, Check, X } from "lucide-react";
import { TIMELINE_LABELS } from "@/lib/utils";
import type { AiInsight, PipelineStage } from "@/types/database";

export function AiInsightCard({
  insight,
  contactId,
  ownerId,
  stages,
}: {
  insight: AiInsight;
  contactId: string;
  ownerId: string;
  stages: PipelineStage[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const suggestedStage = stages.find((s) => s.id === insight.suggested_stage_id);
  const hasSuggestion = !!suggestedStage || !!insight.suggested_timeline;

  async function handleDismiss() {
    setBusy(true);
    const supabase = createClient();
    await supabase.from("ai_insights").update({ dismissed: true }).eq("id", insight.id);
    router.refresh();
  }

  async function handleApply() {
    setBusy(true);
    const supabase = createClient();

    const patch: Record<string, string> = {};
    if (insight.suggested_stage_id) patch.stage_id = insight.suggested_stage_id;
    if (insight.suggested_timeline) patch.timeline = insight.suggested_timeline;

    if (Object.keys(patch).length > 0) {
      await supabase.from("contacts").update(patch).eq("id", contactId);
      await supabase.from("activities").insert({
        owner_id: ownerId,
        contact_id: contactId,
        type: "status_change",
        direction: "none",
        source: "ai",
        body: `AI-suggested update applied: ${insight.summary}`,
      });
    }

    await supabase.from("ai_insights").update({ dismissed: true, applied: true }).eq("id", insight.id);
    router.refresh();
  }

  return (
    <Card className="space-y-3 border-brand-100 bg-brand-50/40">
      <div className="flex items-start gap-2">
        <Sparkles size={16} className="mt-0.5 shrink-0 text-brand-600" />
        <p className="text-sm text-neutral-800">{insight.summary}</p>
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
    </Card>
  );
}
