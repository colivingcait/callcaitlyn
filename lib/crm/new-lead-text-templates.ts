// Pure string logic, no imports - same style as event-text-templates.ts.
// Keys off Contact.lead_source (free text, set once at creation by
// whichever webhook/form created the contact - see the real values at
// app/api/webhooks/site-form/route.ts, lib/eventbrite/process-order.ts,
// etc.), NOT the ActivitySource enum: lead_source is already human-
// readable and needs no extra activities join to resolve, unlike the
// Dialer's old per-registration event-name/account lookup.
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
  // Already human-readable free text (a manual entry, a CSV import, a raw
  // Eventbrite event name) - show it as-is rather than forcing a generic
  // label onto something that's already specific.
  return { bucket: "other", label: leadSource };
}

const OPENERS: Record<NewLeadSourceBucket, (firstName: string) => string> = {
  site_form: (n) => `Hi ${n}, this is Caitlyn Verdugo - thanks so much for reaching out!`,
  instagram: (n) => `Hi ${n}, this is Caitlyn Verdugo - thanks for reaching out on Instagram!`,
  referral: (n) => `Hi ${n}, this is Caitlyn Verdugo - I heard we should connect!`,
  listing_page: (n) => `Hi ${n}, this is Caitlyn Verdugo - thanks for checking out the listing!`,
  blinq: (n) => `Hi ${n}, this is Caitlyn Verdugo - it was great connecting!`,
  scheduling: (n) => `Hi ${n}, this is Caitlyn Verdugo - looking forward to our call!`,
  checkin: (n) => `Hi ${n}, this is Caitlyn Verdugo - thanks for stopping by!`,
  house_hacking: (n) => `Hi ${n}, this is Caitlyn Verdugo with the House Hacking Meetup - thanks for signing up!`,
  quo: (n) => `Hi ${n}, this is Caitlyn Verdugo - thanks for reaching out!`,
  other: (n) => `Hi ${n}, this is Caitlyn Verdugo!`,
};

// Every closer is a genuine question (mirrors event-text-templates.ts's
// FOLLOW_UP_OPENER + question pattern) so a reply is easy, not a broadcast.
const ENGAGEMENT_QUESTIONS: Record<NewLeadSourceBucket, string> = {
  site_form: "What made you reach out - are you actively looking to buy, sell, or just exploring for now?",
  instagram: "What are you working on right now - anything real estate related I can help with?",
  referral: "Excited to help - what's on your radar right now, buying, selling, or investing?",
  listing_page: "Did you have any questions about the property, or want to set up a time to see it?",
  blinq: "What are you working on right now that I could help with?",
  scheduling: "Anything specific you'd like to cover on our call?",
  checkin: "So glad you came by - are you actively looking right now, or still in the research phase?",
  house_hacking: "Are you actively looking right now, or still in the research phase?",
  quo: "What can I help you with?",
  other: "What can I help you with?",
};

export function buildNewLeadDraft(firstName: string, leadSource: string | null): string {
  const { bucket } = resolveNewLeadSource(leadSource);
  return `${OPENERS[bucket](firstName)} ${ENGAGEMENT_QUESTIONS[bucket]}`;
}
