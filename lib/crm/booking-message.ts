import { formatInTimeZone } from "date-fns-tz";

// Pure, no server-only imports - same reasoning as quote-message.ts:
// real values inlined, not merge tokens, since these are always one-off
// sends triggered from an approve/decline action, never a bulk blast.
const APP_TIMEZONE = "America/New_York";

function describeWhen(startsAtIso: string): string {
  return formatInTimeZone(startsAtIso, APP_TIMEZONE, "EEEE, MMM d 'at' h:mm a");
}

export function buildBookingConfirmedMessage(input: { visitorFirstName: string; startsAt: string; meetLink: string | null }): string {
  const when = describeWhen(input.startsAt);
  const meet = input.meetLink ? ` Video call link: ${input.meetLink}` : "";
  return `Hi ${input.visitorFirstName}, you're booked in for ${when}! Talk soon.${meet}`;
}

export function buildBookingDeclinedMessage(input: { visitorFirstName: string; startsAt: string; rebookLink: string }): string {
  const when = describeWhen(input.startsAt);
  return `Hi ${input.visitorFirstName}, sorry - ${when} doesn't work after all. Mind grabbing another time here? ${input.rebookLink}`;
}

export function buildSchedulingLinkMessage(input: { firstName: string; link: string }): string {
  return `Hi ${input.firstName}, here's a link to grab time on my calendar: ${input.link}`;
}
