import { filterByQueue } from "@/lib/crm/contact-queue-filter";
import { getLastActivityLabels } from "@/lib/data/contacts";
import { listPendingDeals } from "@/lib/data/commissions";
import { computeDeals } from "@/lib/crm/commission";
import type { ContactWithRelations, PipelineStage } from "@/types/database";

export type PipelinePendingDeal = { address: string | null; expectedClosingDate: string | null; netCommission: number };

export type PipelineExtras = {
  lastActivityLabels: Map<string, string>;
  coldFromHotIds: Set<string>;
  neverCalledIds: Set<string>;
  pendingDealByContact: Map<string, PipelinePendingDeal>;
};

// Batches everything the redesigned Pipeline's per-card context lines and
// per-stage summary numbers need, reusing queue predicates/helpers that
// already exist for Contacts filters and Insights instead of inventing
// new query logic. computeDeals on just the pending subset (not chained
// off closed deals for the cap year) matches the same simplification
// lib/data/today.ts's getCommissionYearSummary already uses - "projected"
// commission here is an estimate, not a promise.
export async function getPipelineExtras(contacts: ContactWithRelations[], stages: PipelineStage[]): Promise<PipelineExtras> {
  const [lastActivityLabels, coldFromHot, neverCalled, pendingDeals] = await Promise.all([
    getLastActivityLabels(contacts.map((c) => c.id)),
    filterByQueue(contacts, "cold_from_hot", stages),
    filterByQueue(contacts, "never_called", stages),
    listPendingDeals(),
  ]);

  const computedPending = computeDeals(pendingDeals);
  const pendingDealByContact = new Map<string, PipelinePendingDeal>();
  for (const deal of computedPending) {
    if (!deal.contact_id) continue;
    // Most recent pending deal wins if a contact somehow has more than
    // one (listPendingDeals orders closed_at ascending, so later entries
    // overwrite earlier ones).
    pendingDealByContact.set(deal.contact_id, {
      address: deal.address,
      expectedClosingDate: deal.expected_closing_date,
      netCommission: deal.netCommission,
    });
  }

  return {
    lastActivityLabels,
    coldFromHotIds: new Set(coldFromHot.map((c) => c.id)),
    neverCalledIds: new Set(neverCalled.map((c) => c.id)),
    pendingDealByContact,
  };
}
