// Blinq sends this notification (free tier included, no Zapier/Business
// needed) every time someone shares their card back with her: subject
// "🎉 {Name} has sent you their details", body containing their name,
// phone, and email in a plain card layout. The name is pulled from the
// SUBJECT rather than the body - the body's plain-text extraction (HTML
// tags stripped, see extractPlainTextBody) has no reliable structure to
// parse a name out of, but the subject line is consistent and gives it
// to us directly.
const SUBJECT_HINT = /has sent you their details/i;
const NAME_PATTERN = /^(?:🎉\s*)?(.+?)\s+has sent you their details/i;
const PHONE_PATTERN = /\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
const EMAIL_PATTERN = /[^\s<>,"]+@[^\s<>,"]+\.[^\s<>,"]+/g;

export function looksLikeBlinqShareEmail(subject: string): boolean {
  return SUBJECT_HINT.test(subject);
}

export type ParsedBlinqShare = {
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
};

export function parseBlinqShareEmail(subject: string, bodyText: string): ParsedBlinqShare | null {
  const nameMatch = subject.match(NAME_PATTERN);
  if (!nameMatch) return null;

  const fullName = nameMatch[1].trim();
  const [firstName, ...rest] = fullName.split(/\s+/);
  const lastName = rest.join(" ") || null;

  const phoneMatch = bodyText.match(PHONE_PATTERN);
  const emailMatches = bodyText.match(EMAIL_PATTERN) ?? [];
  // Blinq's own addresses (e.g. a connect+...@blinq.me reply-to) can show
  // up in the body too - skip those so the shared contact's real email
  // never gets mistaken for Blinq's own.
  const email = emailMatches.find((e) => !e.toLowerCase().includes("@blinq")) ?? null;

  return { firstName: firstName || null, lastName, phone: phoneMatch?.[0]?.trim() ?? null, email };
}
