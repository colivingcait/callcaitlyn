import type { ContactSort } from "@/lib/data/contacts";
import type { ContactQueue } from "@/lib/crm/contact-queues";

export type ContactGroupBy = "none" | "stage" | "tag" | "source" | "month";

export type ContactFilterParams = {
  q?: string;
  stageId?: string;
  tagIds?: string[];
  type?: string;
  timeline?: string;
  representing?: string;
  leadSource?: string;
  hasPhone?: boolean;
  missingPhone?: boolean;
  hasEmail?: boolean;
  missingEmail?: boolean;
  hasFollowUp?: boolean;
  missingFollowUp?: boolean;
  overdueFollowUp?: boolean;
  archived?: "active" | "archived" | "all";
  hasNotes?: boolean;
  missingNotes?: boolean;
  birthdayMonth?: number;
  city?: string;
  state?: string;
  minBudget?: number;
  notSyncedQuo?: boolean;
  eventName?: string;
  registeredEventName?: string;
  likelihood?: "high" | "medium" | "low";
  queue?: ContactQueue;
  leadDateWithinDays?: number;
  leadDateFrom?: string;
  leadDateTo?: string;
  groupBy?: ContactGroupBy;
  sort?: ContactSort;
};

// Single source of truth for reading contact-list query params, used by
// both the Contacts page and the CSV export route - keeping this in one
// place is what stops the two from silently drifting apart the way the
// export route almost did when it was first hand-rolled separately.
export function parseContactFilterParams(sp: URLSearchParams): ContactFilterParams {
  const followup = sp.get("followup");
  const phone = sp.get("phone");
  const email = sp.get("email");
  const notes = sp.get("notes");

  return {
    q: sp.get("q") ?? undefined,
    stageId: sp.get("stage") ?? undefined,
    tagIds: sp.get("tags") ? sp.get("tags")!.split(",").filter(Boolean) : undefined,
    type: sp.get("type") ?? undefined,
    timeline: sp.get("timeline") ?? undefined,
    representing: sp.get("representing") ?? undefined,
    leadSource: sp.get("source") ?? undefined,
    hasPhone: phone === "1",
    missingPhone: phone === "0",
    hasEmail: email === "1",
    missingEmail: email === "0",
    hasFollowUp: followup === "1",
    missingFollowUp: followup === "0",
    overdueFollowUp: followup === "overdue",
    archived: (sp.get("archived") as ContactFilterParams["archived"]) ?? undefined,
    hasNotes: notes === "1",
    missingNotes: notes === "0",
    birthdayMonth: sp.get("birthdayMonth") ? Number(sp.get("birthdayMonth")) : undefined,
    city: sp.get("city") ?? undefined,
    state: sp.get("state") ?? undefined,
    minBudget: sp.get("minBudget") ? Number(sp.get("minBudget")) : undefined,
    notSyncedQuo: sp.get("quoSync") === "0",
    eventName: sp.get("event") ?? undefined,
    registeredEventName: sp.get("regEvent") ?? undefined,
    likelihood: (sp.get("likelihood") as ContactFilterParams["likelihood"]) ?? undefined,
    queue: (sp.get("queue") as ContactQueue) ?? undefined,
    leadDateWithinDays: sp.get("newSince") ? Number(sp.get("newSince")) : undefined,
    leadDateFrom: sp.get("leadFrom") ?? undefined,
    leadDateTo: sp.get("leadTo") ?? undefined,
    groupBy: (sp.get("group") as ContactGroupBy) ?? undefined,
    sort: (sp.get("sort") as ContactSort) ?? undefined,
  };
}
