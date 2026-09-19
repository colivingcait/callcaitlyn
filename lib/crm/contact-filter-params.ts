import type { ContactSort } from "@/lib/data/contacts";
import type { ContactQueue } from "@/lib/crm/contact-queues";

export type ContactGroupBy = "none" | "stage" | "tag" | "source" | "month";

// URL sentinels for the registration dropdown. Production used to label
// missing/empty regEvent as "Registered for: any event" while applying no
// predicate (Tess: Austin Sizemore still in ?phone=1). Missing/empty now
// MEANS any-event on the main Contacts browse. Explicit opt-out is __all__.
export const REGISTERED_FOR_ANY_EVENT = "__any__";
export const NOT_FILTERED_BY_REGISTRATION = "__all__";
export const EVER_ATTENDED_EVENT = "__any__";

// Working-list / insight deep links that are not the Tess browse combo.
// Those URLs omit regEvent on purpose and must not inherit the any-event default.
const REGISTRATION_DEFAULT_OPT_OUT_KEYS = [
  "queue", "event", "newSince", "leadFrom", "leadTo", "archived", "type", "tags", "source", "q", "likelihood", "followup", "email", "notes", "ids", "list",
] as const;

export function resolveRegisteredEventName(sp: URLSearchParams): string | undefined {
  const raw = sp.get("regEvent");
  if (raw === NOT_FILTERED_BY_REGISTRATION) return undefined;
  if (raw === REGISTERED_FOR_ANY_EVENT || raw === "") return REGISTERED_FOR_ANY_EVENT;
  if (raw) return raw;
  if (sp.get("phone") === "0") return undefined;
  for (const key of REGISTRATION_DEFAULT_OPT_OUT_KEYS) {
    if (sp.get(key)) return undefined;
  }
  return REGISTERED_FOR_ANY_EVENT;
}

export function registrationSelectValue(sp: URLSearchParams): string {
  return resolveRegisteredEventName(sp) ?? NOT_FILTERED_BY_REGISTRATION;
}

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
  includeIds?: string[];
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
    registeredEventName: resolveRegisteredEventName(sp),
    likelihood: (sp.get("likelihood") as ContactFilterParams["likelihood"]) ?? undefined,
    queue: (sp.get("queue") as ContactQueue) ?? undefined,
    leadDateWithinDays: sp.get("newSince") ? Number(sp.get("newSince")) : undefined,
    leadDateFrom: sp.get("leadFrom") ?? undefined,
    leadDateTo: sp.get("leadTo") ?? undefined,
    groupBy: (sp.get("group") as ContactGroupBy) ?? undefined,
    sort: (sp.get("sort") as ContactSort) ?? undefined,
    includeIds: sp.get("ids") ? sp.get("ids")!.split(",").filter(Boolean) : undefined,
  };
}

export const SHEET_PARAM_KEYS = [
  "stage", "type", "tags", "source", "timeline", "representing", "likelihood",
  "phone", "email", "followup", "notes", "newSince", "leadFrom", "leadTo",
  "event", "regEvent", "city", "state", "birthdayMonth", "minBudget", "archived", "quoSync", "group",
] as const;

export function parseIncludeIds(raw: string | null | undefined): string[] {
  return raw ? raw.split(",").map((id) => id.trim()).filter(Boolean) : [];
}

export function mergeIncludeIds(existing: string | null | undefined, extra: string[]): string {
  return [...new Set([...parseIncludeIds(existing), ...extra])].join(",");
}
