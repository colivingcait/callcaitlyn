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
