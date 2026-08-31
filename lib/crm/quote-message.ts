import { formatCurrency } from "@/lib/utils";

// Pure, no server-only imports (lib/crm/sequences.ts pulls in googleapis
// via lib/google/send-email.ts, which breaks the client bundle - this
// module is imported from the client-side SendPanel, so the full link is
// built server-side in app/(app)/numbers/actions.ts's saveQuote and
// passed in here, not computed from process.env on the client). Real
// values inlined, not merge tokens - same style as
// lib/crm/event-text-templates.ts's single-send templates, since this is
// always a one-off send from the calculator's Send panel, never a bulk
// staggered blast that needs applyMergeFields.
export function buildQuoteMessage(input: {
  firstName: string;
  monthlyOutOfPocket: number;
  propertyAddress: string;
  link: string;
}): { smsBody: string; emailSubject: string; emailBody: string } {
  const link = input.link;
  const address = input.propertyAddress.trim() || "the property";
  const payment = formatCurrency(input.monthlyOutOfPocket);

  const smsBody = `Ran the numbers on ${address} - living in one side and renting the other, you'd be out of pocket about ${payment} a month. Full breakdown here: ${link}`;
  const emailSubject = `Numbers on ${address}`;
  const emailBody = `Hi ${input.firstName},\n\n${smsBody}\n\nLet me know if you want to run it with different numbers.`;

  return { smsBody, emailSubject, emailBody };
}
