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

// Single-send versions (a real first name, not a merge token) - used by the
// Dialer's one-off "text this person right now" flow, not the bulk blast
// composer below. Kept separate from MESSAGE_TEMPLATES since that one needs
// the literal {{first_name}} token for applyMergeFields to substitute once
// per recipient during a staggered send.
export function newRegistrationTemplate(firstName: string, account: string | null | undefined, eventName: string | null | undefined): string {
  const group = eventGroupLabel(account, eventName);
  return `Hi ${firstName}, this is Caitlyn Verdugo, one of the organizers for ${group}. Just wanted to introduce myself and welcome you to the group! Any questions I can answer for you? 🙂`;
}

export function returningRegistrationTemplate(firstName: string, account: string | null | undefined, eventName: string | null | undefined): string {
  const group = eventGroupLabel(account, eventName);
  return `Hey ${firstName}, this is Caitlyn Verdugo, one of the organizers for ${group}. Just got your registration for this month's meetup - looking forward to seeing you again!`;
}

export type MessageTemplateOption = { label: string; build: (account: string | null | undefined, eventName: string | null | undefined) => string };
export type MessageTemplateCategory = { key: "registration" | "pre_event" | "follow_up"; label: string; options: MessageTemplateOption[] };

const FOLLOW_UP_OPENER = "Hi {{first_name}}! Thank you so much for joining us last night - it was so great seeing you!";

// Bulk-blast templates, grouped into the three moments she actually sends
// texts around - shown behind one button per category in the composer,
// which opens a picker over just that category's options rather than one
// long undifferentiated row of buttons. Every option contains the literal
// {{first_name}} token (not a real name), substituted once per recipient
// by applyMergeFields during the actual staggered send.
export const MESSAGE_TEMPLATE_CATEGORIES: MessageTemplateCategory[] = [
  {
    key: "registration",
    label: "Registration",
    options: [
      {
        label: "Welcome (new registrant)",
        build: (account, eventName) =>
          `Hi {{first_name}}, this is Caitlyn Verdugo, one of the organizers for ${eventGroupLabel(account, eventName)}. Just wanted to introduce myself and welcome you to the group! Any questions I can answer for you? 🙂`,
      },
      {
        label: "Welcome back (returning)",
        build: (account, eventName) =>
          `Hey {{first_name}}, this is Caitlyn Verdugo, one of the organizers for ${eventGroupLabel(account, eventName)}. Just got your registration for this month's meetup - looking forward to seeing you there! Any questions I can answer? 🙂`,
      },
    ],
  },
  {
    key: "pre_event",
    label: "Pre-event",
    options: [
      {
        label: "Week before",
        build: (account, eventName) =>
          `Hi {{first_name}}, this is Caitlyn Verdugo - mark your calendars, ${eventGroupLabel(account, eventName)} is next week! 🗓️ Will you be bringing anyone with you?`,
      },
      {
        label: "Few days before (recent sign-ups)",
        build: (account, eventName) =>
          `Hi {{first_name}}, this is Caitlyn Verdugo - thanks for signing up for ${eventGroupLabel(account, eventName)}! It's coming up in just a few days, so make sure to mark your calendars. 🗓️`,
      },
      {
        label: "Day before",
        build: () =>
          `Hi {{first_name}}! Woohoo, our meetup is tomorrow! Doors open at 6:30 for drinks and networking, and our speaker will start around 7! We'd love your help in preparing for this event - are you planning on joining us tomorrow? Just a simple yes or no would be very helpful! Thank you! 😊\n- Caitlyn Verdugo`,
      },
      {
        label: "Day of",
        build: (account, eventName) => `Hi {{first_name}}, this is Caitlyn Verdugo - quick reminder that ${eventGroupLabel(account, eventName)} is today! Can't wait to see you there. 🙂`,
      },
    ],
  },
  {
    key: "follow_up",
    label: "Follow-up",
    // Every option shares this opener, then ends in a genuine question
    // rather than a statement - the goal is a reply, not just an
    // impression, so a recipient can respond in one line without it
    // feeling like reading a broadcast.
    options: [
      { label: "Ask their takeaway", build: () => `${FOLLOW_UP_OPENER} What was your biggest takeaway from last night? Would love to hear.` },
      { label: "Ask where they're at", build: () => `${FOLLOW_UP_OPENER} Are you actively looking right now, or still in the research phase?` },
      { label: "Ask for topic ideas", build: () => `${FOLLOW_UP_OPENER} What topic would you want us to cover at a future meetup?` },
      {
        label: "Offer to help",
        build: () => `${FOLLOW_UP_OPENER} Anything I can help you with as you continue on your real estate investing journey? Would love to chat about it 🤩`,
      },
    ],
  },
];
