// Pure string logic, no imports - same style as event-text-templates.ts.
//
// First-touch SMS for New/uncontacted. Caitlyn's confirmed copy, 2026-09-17:
// Women's REI vs House Hacking Atlanta, {{first_name}} merged at compose.
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

export type FirstTouchMeetup = "womens_rei" | "house_hacking" | "other";

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

// Used only when New/uncontacted isn't a Women's REI or House Hacking lead.
export const FIRST_TOUCH_FALLBACK = "Hi {{first_name}}, this is Caitlyn Verdugo…";

const WOMENS_TEXT = /women'?s?\s*(rei|r\.?e\.?i\.?|real estate|investors?)/i;
const HOUSE_HACK_TEXT = /house\s*hack/i;

function blob(signals: FirstTouchSignals): string {
  return [signals.leadSource, signals.lastEventName].filter(Boolean).join("\n");
}

function tagSet(signals: FirstTouchSignals): Set<string> {
  return new Set((signals.tagNames ?? []).map((name) => name.trim().toLowerCase()).filter(Boolean));
}

export function resolveFirstTouchMeetup(signals: FirstTouchSignals): FirstTouchMeetup {
  const tags = tagSet(signals);
  const account = signals.eventbriteAccount?.trim();
  const text = blob(signals);

  // Women's REI tag/account wins even when the event name mentions house
  // hacking (a real Eventbrite case — see process-order.ts).
  if (account === "womens_rei" || tags.has("women's rei") || tags.has("womens rei")) return "womens_rei";
  if (WOMENS_TEXT.test(text)) return "womens_rei";

  if (account === "house_hacking" || tags.has("house hacking")) return "house_hacking";
  if (HOUSE_HACK_TEXT.test(text)) return "house_hacking";

  return "other";
}

export function firstTouchTemplate(signals: FirstTouchSignals): string {
  const meetup = resolveFirstTouchMeetup(signals);
  if (meetup === "womens_rei") return FIRST_TOUCH_WOMENS_REI;
  if (meetup === "house_hacking") return FIRST_TOUCH_HOUSE_HACKING;
  return FIRST_TOUCH_FALLBACK;
}

// First SMS compose (no outbound text yet). Meetup copy still fills after
// a call; the fallback only fills when this is a true first touch.
export function shouldPrefillFirstTouchSms(opts: {
  hasOutboundText: boolean;
  hasPriorOutreach?: boolean;
  meetup: FirstTouchMeetup;
}): boolean {
  if (opts.hasOutboundText) return false;
  if (opts.meetup !== "other") return true;
  return !opts.hasPriorOutreach;
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
