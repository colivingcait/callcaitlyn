// Pure string logic, no imports. eventbrite_account (set at ingestion -
// see lib/eventbrite/process-order.ts) is the reliable signal for which
// meetup a registration belongs to; falls back to guessing off the event
// NAME text only when that's missing (e.g. a Calendly booking has no
// account tag) - the name text alone can't be trusted, since an event like
// "Inside the Making of a 250-Home Neighborhood" doesn't contain "women"
// even when it's a Women's REI event. Always shown in an editable box
// before sending, never sent unread, so a wrong guess is a one-word edit,
// not a bad send.
export function eventGroupLabel(account: string | null | undefined, eventName: string | null | undefined): string {
  if (account === "womens_rei") return "the Women's Real Estate Meetup";
  if (account === "house_hacking") return "the House Hacking Meetup";
  if (eventName) return /women/i.test(eventName) ? "the Women's Real Estate Meetup" : "the House Hacking Meetup";
  return "the meetup";
}

export function newRegistrationTemplate(firstName: string, account: string | null | undefined, eventName: string | null | undefined): string {
  const group = eventGroupLabel(account, eventName);
  return `Hi ${firstName}, this is Caitlyn Verdugo, one of the organizers for ${group}. Just wanted to introduce myself and welcome you to the group! Any questions I can answer for you? 🙂`;
}

export function returningRegistrationTemplate(firstName: string, account: string | null | undefined, eventName: string | null | undefined): string {
  const group = eventGroupLabel(account, eventName);
  return `Hey ${firstName}, this is Caitlyn Verdugo, one of the organizers for ${group}. Just got your registration for this month's meetup - looking forward to seeing you again!`;
}

// Bulk-blast reminder templates - contain the literal {{first_name}} token
// (not a real name) since applyMergeFields runs later, once per recipient,
// during the actual staggered send.
export function dayBeforeReminderTemplate(account: string | null | undefined, eventName: string | null | undefined): string {
  const group = eventGroupLabel(account, eventName);
  return `Hi {{first_name}}, this is Caitlyn Verdugo - just a reminder that ${group} is tomorrow! Looking forward to seeing you there. 🙂`;
}

export function dayOfReminderTemplate(account: string | null | undefined, eventName: string | null | undefined): string {
  const group = eventGroupLabel(account, eventName);
  return `Hi {{first_name}}, this is Caitlyn Verdugo - quick reminder that ${group} is today! Can't wait to see you there. 🙂`;
}

export function weekBeforeReminderTemplate(account: string | null | undefined, eventName: string | null | undefined): string {
  const group = eventGroupLabel(account, eventName);
  return `Hi {{first_name}}, this is Caitlyn Verdugo - just checking in ahead of ${group} next week! Are you still planning on joining us? Let me know if anything's changed. 🙂`;
}

// Post-event outreach, each ending in a genuine question rather than a
// statement - the goal is a reply, not just an impression, so a recipient
// can respond in one line without it feeling like reading a broadcast.
// Distinct from the reminder templates above (which are safe to blast
// identically to everyone); these read best sent to the people who were
// actually there, but nothing here is occurrence-specific enough to require
// it - shown as a picker in the compose UI so she can choose the angle that
// fits the room.
export type FollowUpTemplateOption = { label: string; build: (account: string | null | undefined, eventName: string | null | undefined) => string };

export const FOLLOW_UP_TEMPLATES: FollowUpTemplateOption[] = [
  {
    label: "Ask their takeaway",
    build: (account, eventName) =>
      `Hi {{first_name}}, this is Caitlyn Verdugo - so glad you made it out to ${eventGroupLabel(account, eventName)}! What was your biggest takeaway from last night? Would love to hear.`,
  },
  {
    label: "Ask where they're at",
    build: (account, eventName) =>
      `Hey {{first_name}}, thanks for coming out to ${eventGroupLabel(account, eventName)}! I'd love to hear more about where you're at - are you actively looking right now, or still in the research phase?`,
  },
  {
    label: "Ask for topic ideas",
    build: (account, eventName) =>
      `Hi {{first_name}}, Caitlyn here from ${eventGroupLabel(account, eventName)} - question for you: what topic would you want us to cover at a future meetup?`,
  },
  {
    label: "Offer to help",
    build: (account, eventName) =>
      `Hey {{first_name}}, really enjoyed connecting at ${eventGroupLabel(account, eventName)}! Anything I can help you with as you keep exploring this? Happy to jump on a call if that'd be useful.`,
  },
];
