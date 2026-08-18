// Pure string logic, no imports - the registration event name is free text
// from Eventbrite, not a stored "which meetup" enum, so which welcome
// wording fits is a best-effort guess off the name itself rather than a
// hard lookup. Always shown in an editable box before sending, never sent
// unread, so a wrong guess here just means a one-word edit, not a bad send.
export function eventGroupLabel(eventName: string | null | undefined): string {
  if (!eventName) return "the meetup";
  return /women/i.test(eventName) ? "the Women's Real Estate Meetup" : "the House Hacking Meetup";
}

export function newRegistrationTemplate(firstName: string, eventName: string | null | undefined): string {
  const group = eventGroupLabel(eventName);
  return `Hi ${firstName}, this is Caitlyn Verdugo, one of the organizers for ${group}. Just wanted to introduce myself and welcome you to the group! Any questions I can answer for you? 🙂`;
}

export function returningRegistrationTemplate(firstName: string, eventName: string | null | undefined): string {
  const group = eventGroupLabel(eventName);
  return `Hey ${firstName}, this is Caitlyn Verdugo, one of the organizers for ${group}. Just got your registration for this month's meetup - looking forward to seeing you again!`;
}
