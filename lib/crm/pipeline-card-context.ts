import { formatLocal } from "@/lib/format-time";
import { CONTACT_TYPE_LABELS, TIMELINE_LABELS } from "@/lib/utils";
import type { ContactWithRelations, PipelineStage } from "@/types/database";
import type { PipelineExtras, PipelinePendingDeal } from "@/lib/data/pipeline";

export type PipelineCardContext = { line: string; quiet: boolean };

// The one fact that matters for this stage, per the design brief: an
// address and closing date under contract, recency and timeline when
// hot, the most recent communication on any channel for everything else
// - not call status specifically, since calling isn't how she primarily
// reaches people (texts, emails, and Instagram DMs all count the same
// here - see getLastActivityLabels).
export function getPipelineCardContext(
  contact: ContactWithRelations,
  stage: PipelineStage | undefined,
  extras: PipelineExtras,
  // A contact can have more than one deal under contract at once - the
  // board renders one row per deal in that case (see PipelineBoard.tsx),
  // and passes the specific deal for this row here instead of letting
  // this function guess which one. Falls back to the first on file for
  // any caller that doesn't pass one.
  dealOverride?: PipelinePendingDeal,
): PipelineCardContext {
  if (stage?.is_under_contract) {
    const deal = dealOverride ?? extras.pendingDealByContact.get(contact.id)?.[0];
    if (deal) {
      // A deal whose expected closing date has already passed with no
      // status change looks identical to one closing next week otherwise -
      // exactly the "which deals are about to blow up" gap that mattered
      // most for a phone-first agent. Reuses the same quiet:true → red/bold
      // treatment PipelineCard/PipelineMobileRow already apply for "gone
      // quiet," so no UI change was needed to surface it.
      const overdue = !!deal.expectedClosingDate && new Date(deal.expectedClosingDate) < new Date();
      const closingLabel = deal.expectedClosingDate
        ? overdue
          ? `was closing ${formatLocal(deal.expectedClosingDate, "MMM d")} - past due`
          : `closing ${formatLocal(deal.expectedClosingDate, "MMM d")}`
        : null;
      const parts = [deal.address, closingLabel].filter(Boolean);
      if (parts.length > 0) return { line: parts.join(" · "), quiet: overdue };
    }
    return { line: CONTACT_TYPE_LABELS[contact.contact_type] ?? "", quiet: false };
  }

  const contactType = CONTACT_TYPE_LABELS[contact.contact_type];
  const timelineLabel = contact.timeline ? TIMELINE_LABELS[contact.timeline] : null;
  const lastActivity = extras.lastActivityLabels.get(contact.id);

  if (extras.coldFromHotIds.has(contact.id)) {
    return { line: lastActivity ? `Last ${lastActivity}` : "No outreach yet", quiet: true };
  }

  if (!lastActivity) {
    return { line: [contactType, "no contact yet"].filter(Boolean).join(" · "), quiet: false };
  }

  const line = [lastActivity, timelineLabel].filter(Boolean).join(" · ") || contactType;
  return { line: line ?? "", quiet: false };
}
