import { filterByQueue } from "@/lib/crm/contact-queue-filter";
import { getLastActivityLabels } from "@/lib/data/contacts";
import { listPendingDeals } from "@/lib/data/commissions";
import { computeDeals } from "@/lib/crm/commission";
import type { ContactWithRelations, PipelineStage } from "@/types/database";

export type PipelinePendingDeal = { id: string; address: string | null; expectedClosingDate: string | null; netCommission: number };

export type PipelineExtras = {
  lastActivityLabels: Map<string, string>;
  coldFromHotIds: Set<string>;
  noContactIds: Set<string>;
  // A contact can genuinely have more than one deal under contract at
  // once (e.g. representing them as both buyer and seller) - every
  // pending deal is kept, not just the most recent, so Pipeline can show
  // each one instead of silently dropping all but one.
  pendingDealByContact: Map<string, PipelinePendingDeal[]>;
};

// Batches everything the redesigned Pipeline's per-card context lines and
// per-stage summary numbers need, reusing queue predicates/helpers that
// already exist for Contacts filters and Insights instead of inventing
// new query logic. computeDeals on just the pending subset (not chained
// off closed deals for the cap year) matches the same simplification
// lib/data/today.ts's getCommissionYearSummary already uses - "projected"
// commission here is an estimate, not a promise.
export async function getPipelineExtras(contacts: ContactWithRelations[], stages: PipelineStage[]): Promise<PipelineExtras> {
  const [lastActivityLabels, coldFromHot, noContact, pendingDeals] = await Promise.all([
    getLastActivityLabels(contacts.map((c) => c.id)),
    filterByQueue(contacts, "cold_from_hot", stages),
    filterByQueue(contacts, "no_contact", stages),
    listPendingDeals(),
  ]);

  const computedPending = computeDeals(pendingDeals);
  const pendingDealByContact = new Map<string, PipelinePendingDeal[]>();
  for (const deal of computedPending) {
    if (!deal.contact_id) continue;
    const list = pendingDealByContact.get(deal.contact_id) ?? [];
    list.push({
      id: deal.id,
      address: deal.address,
      expectedClosingDate: deal.expected_closing_date,
      netCommission: deal.netCommission,
    });
    pendingDealByContact.set(deal.contact_id, list);
  }

  return {
    lastActivityLabels,
    coldFromHotIds: new Set(coldFromHot.map((c) => c.id)),
    noContactIds: new Set(noContact.map((c) => c.id)),
    pendingDealByContact,
  };
}
