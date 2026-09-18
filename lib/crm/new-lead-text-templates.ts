// Pure string logic, no imports - same style as event-text-templates.ts.
//
// First-touch SMS for New/uncontacted. Caitlyn's locked copy, 2026-09-17:
// five source-routed templates, {{first_name}} merged at compose.
// Eventbrite stores lead_source as the event *name* (see process-order.ts),
// so routing also reads last_event_name, Meetup tags, and eventbrite_account.

export type NewLeadSourceBucket =
  | "site_form"
  | "instagram"
  | "referral"
  | "listing_page"
  | "blinq"
  | "scheduling"
  | "checkin"
  | "house_hacking"
  | "quo"
  | "other";

export type NewLeadSourceInfo = { bucket: NewLeadSourceBucket; label: string };

export type FirstTouchSource = "womens_rei" | "house_hacking" | "blinq" | "listing" | "webform" | "other";

/** @deprecated use FirstTouchSource */
export type FirstTouchMeetup = FirstTouchSource;

export type FirstTouchSignals = {
  leadSource?: string | null;
  lastEventName?: string | null;
  tagNames?: readonly string[] | null;
  eventbriteAccount?: string | null;
};

// Caitlyn's exact strings. Do not rewrite.
export const FIRST_TOUCH_WOMENS_REI =
  "Hi {{first_name}}, this is Caitlyn Verdugo, one of the organizers for the Women's Real Estate Meetup. Just wanted to introduce myself and welcome you to the group! Any questions I can answer for you? 🙂";

export const FIRST_TOUCH_HOUSE_HACKING =
  "Hi {{first_name}}, this is Caitlyn Verdugo, the organizer of the House Hacking Atlanta Meetup. Just wanted to introduce myself and welcome you to the group! Any questions I can answer for you? 🙂";

export const FIRST_TOUCH_BLINQ = "Hi {{first_name}}, this is Caitlyn! It was great meeting you! 🙂";

export const FIRST_TOUCH_LISTING =
  "Hi {{first_name}}, this is Caitlyn Verdugo with KW Metro Atlanta. I saw you checked out the offering on one of my listings - what questions I can answer for you? 🙂";

export const FIRST_TOUCH_WEBFORM =
  "Hi {{first_name}}, this is Caitlyn Verdugo with KW Metro Atlanta. Thanks for reaching out through my site — just wanted to introduce myself and see what you’re looking for! Any questions I can answer for you? 🙂";

// Last resort only when none of the five sources match.
export const FIRST_TOUCH_FALLBACK = "Hi {{first_name}}, this is Caitlyn Verdugo…";

const WOMENS_TEXT = /women'?s?\s*(rei|r\.?e\.?i\.?|real estate|investors?)/i;
const HOUSE_HACK_TEXT = /house\s*hack/i;
const BLINQ_TEXT = /\bblinq\b/i;
const LISTING_PAGE_TEXT = /^listing page\b/i;
const CALLCAITLYN_WEBFORM_TEXT = /callcaitlyn\.com\b|^callcaitlyn\b/i;

function blob(signals: FirstTouchSignals): string {
  return [signals.leadSource, signals.lastEventName].filter(Boolean).join("\n");
}

function tagSet(signals: FirstTouchSignals): Set<string> {
  return new Set((signals.tagNames ?? []).map((name) => name.trim().toLowerCase()).filter(Boolean));
}

export function resolveFirstTouchSource(signals: FirstTouchSignals): FirstTouchSource {
  const tags = tagSet(signals);
  const account = signals.eventbriteAccount?.trim();
  const text = blob(signals);
  const lead = signals.leadSource?.trim() ?? "";

  // Women's REI tag/account wins even when the event name mentions house
  // hacking (a real Eventbrite case — see process-order.ts).
  if (account === "womens_rei" || tags.has("women's rei") || tags.has("womens rei")) return "womens_rei";
  if (WOMENS_TEXT.test(text)) return "womens_rei";

  if (account === "house_hacking" || tags.has("house hacking")) return "house_hacking";
  if (HOUSE_HACK_TEXT.test(text)) return "house_hacking";

  if (tags.has("blinq") || BLINQ_TEXT.test(lead) || BLINQ_TEXT.test(text)) return "blinq";

  // Public OM unlock / offer / seller analysis — lead_source is
  // "Listing page — {nickname}" (see app/listing/[slug]/actions.ts).
  // Investor Lead is only applied on that unlock path.
  if (LISTING_PAGE_TEXT.test(lead) || tags.has("investor lead")) return "listing";

  if (CALLCAITLYN_WEBFORM_TEXT.test(lead)) return "webform";

  return "other";
}

/** @deprecated use resolveFirstTouchSource */
export function resolveFirstTouchMeetup(signals: FirstTouchSignals): FirstTouchSource {
  return resolveFirstTouchSource(signals);
}

export function eventbriteAccountFromActivities(
  activities: { metadata?: Record<string, unknown> | null }[],
): string | null {
  for (const a of activities) {
    const account = a.metadata?.eventbrite_account;
    if (account === "womens_rei" || account === "house_hacking") return account;
  }
  return null;
}

export function messageComposeHref(contactId: string, draft?: string | null): string {
  const trimmed = draft?.trim();
  if (!trimmed) return `/messages/${contactId}`;
  return `/messages/${contactId}?draft=${encodeURIComponent(trimmed)}`;
}

export function firstTouchTemplate(signals: FirstTouchSignals): string {
  switch (resolveFirstTouchSource(signals)) {
    case "womens_rei":
      return FIRST_TOUCH_WOMENS_REI;
    case "house_hacking":
      return FIRST_TOUCH_HOUSE_HACKING;
    case "blinq":
      return FIRST_TOUCH_BLINQ;
    case "listing":
      return FIRST_TOUCH_LISTING;
    case "webform":
      return FIRST_TOUCH_WEBFORM;
    default:
      return FIRST_TOUCH_FALLBACK;
  }
}

// First SMS compose (no outbound text yet) always gets a draft — matched
// source template, or the last-resort intro. Do not leave compose blank.
export function shouldPrefillFirstTouchSms(opts: {
  hasOutboundText: boolean;
  hasPriorOutreach?: boolean;
  source: FirstTouchSource;
  /** @deprecated use source */
  meetup?: FirstTouchSource;
}): boolean {
  return !opts.hasOutboundText;
}

// Order matters - first match wins. An Eventbrite lead_source is just the
// raw event name (no reliable "Eventbrite" keyword in it - the same
// unreliability event-text-templates.ts's eventGroupLabel comment already
// flags), so it's deliberately left unmatched here: it falls through to
// "other" and shows as-is, which is still a meaningful, readable tag even
// though it skips the meetup-specific opener.
const PATTERNS: { test: RegExp; bucket: NewLeadSourceBucket; label: string }[] = [
  { test: /instagram/i, bucket: "instagram", label: "Instagram" },
  { test: /referral/i, bucket: "referral", label: "Referral" },
  { test: /blinq/i, bucket: "blinq", label: "Blinq" },
  { test: /^listing page/i, bucket: "listing_page", label: "Listing page" },
  { test: /scheduling page|calendly/i, bucket: "scheduling", label: "Scheduling" },
  { test: /walk-in|jotform/i, bucket: "checkin", label: "Event check-in" },
  { test: /house hacking site/i, bucket: "house_hacking", label: "House Hacking Site" },
  { test: /^quo /i, bucket: "quo", label: "Inbound call/text" },
  { test: /coliving\s?cait|callcaitlyn|women'?s (coliving summit|investors)|granola/i, bucket: "site_form", label: "Site form" },
];

export function resolveNewLeadSource(leadSource: string | null): NewLeadSourceInfo {
  if (!leadSource) return { bucket: "other", label: "New lead" };
  const hit = PATTERNS.find((p) => p.test.test(leadSource));
  if (hit) return { bucket: hit.bucket, label: hit.label };
  return { bucket: "other", label: leadSource };
}

export function buildNewLeadDraft(firstName: string, leadSource: string | null, extra?: Omit<FirstTouchSignals, "leadSource">): string {
  const template = firstTouchTemplate({ leadSource, ...extra });
  return template.replace(/\{\{\s*first_name\s*\}\}/gi, firstName || "");
}
