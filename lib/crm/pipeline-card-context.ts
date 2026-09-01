import { formatLocal } from "@/lib/format-time";
import { CONTACT_TYPE_LABELS, TIMELINE_LABELS } from "@/lib/utils";
import type { ContactWithRelations, PipelineStage } from "@/types/database";
import type { PipelineExtras } from "@/lib/data/pipeline";

export type PipelineCardContext = { line: string; quiet: boolean };

// The one fact that matters for this stage, per the design brief: an
// address and closing date under contract, recency and timeline when
// hot, "never called" for a brand-new lead - falling back to whatever
// activity/timeline data is on file for everything else.
export function getPipelineCardContext(
  contact: ContactWithRelations,
  stage: PipelineStage | undefined,
  extras: PipelineExtras,
): PipelineCardContext {
  if (stage?.is_under_contract) {
    const deal = extras.pendingDealByContact.get(contact.id);
    if (deal) {
      const parts = [deal.address, deal.expectedClosingDate ? `closing ${formatLocal(deal.expectedClosingDate, "MMM d")}` : null].filter(Boolean);
      if (parts.length > 0) return { line: parts.join(" · "), quiet: false };
    }
    return { line: CONTACT_TYPE_LABELS[contact.contact_type] ?? "", quiet: false };
  }

  const contactType = CONTACT_TYPE_LABELS[contact.contact_type];
  const timelineLabel = contact.timeline ? TIMELINE_LABELS[contact.timeline] : null;

  if (extras.coldFromHotIds.has(contact.id)) {
    const lastActivity = extras.lastActivityLabels.get(contact.id);
    return { line: lastActivity ? `Last ${lastActivity}` : "No outreach yet", quiet: true };
  }

  if (extras.neverCalledIds.has(contact.id)) {
    return { line: [contactType, "never called"].filter(Boolean).join(" · "), quiet: false };
  }

  const lastActivity = extras.lastActivityLabels.get(contact.id);
  const line = [lastActivity, timelineLabel].filter(Boolean).join(" · ") || contactType;
  return { line: line ?? "", quiet: false };
}
