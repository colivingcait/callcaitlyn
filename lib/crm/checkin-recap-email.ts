import type { ContactCard } from "@/lib/checkin/contact-cards";
import { baseUrl } from "@/lib/crm/sequences";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// A link on the check-in success screen can be relative (it's an in-app
// anchor, same origin) but a link inside an email has to be absolute.
function absolute(url: string): string {
  return url.startsWith("/") ? `${baseUrl()}${url}` : url;
}

export type CheckinRecapPayload = {
  firstName: string | null;
  eventName: string;
  cards: ContactCard[];
  eventsUrl?: string;
  // Only House Hacking has a Facebook group and standalone site today - see
  // SERIES_COMMUNITY_LINKS in lib/checkin/contact-cards.ts.
  communityLinks?: { facebookUrl: string; websiteUrl: string };
};

// Sent once per genuine check-in (see lib/checkin/process-checkin.ts) so
// someone who couldn't find a sponsor's info in the room - or never opened
// the "Get in touch" cards at all - still has it in their inbox the next
// morning. Deliberately plain/transactional (no tracking pixel, no
// unsubscribe footer) like renderPrepSheetEmail/renderWeeklyReviewEmail -
// this is a one-off receipt of a specific check-in, not a marketing send.
export function renderCheckinRecapEmail(payload: CheckinRecapPayload): string {
  const greeting = payload.firstName ? `Hi ${esc(payload.firstName)},` : "Hi,";

  const cardRows = payload.cards
    .map((c) => {
      const contactLines = [
        c.phone ? `<a href="tel:${esc(c.phone.replace(/[^\d+]/g, ""))}">${esc(c.phone)}</a>` : "",
        c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : "",
        c.bookingUrl ? `<a href="${esc(absolute(c.bookingUrl))}">Book a call →</a>` : "",
      ]
        .filter(Boolean)
        .join(" &nbsp;|&nbsp; ");

      return `
        <div style="margin-bottom:14px">
          <p style="margin:0;font-weight:bold">${esc(c.name)}</p>
          <p style="margin:0;color:#78716c;font-size:14px">${esc(c.role)}</p>
          ${contactLines ? `<p style="margin:2px 0 0">${contactLines}</p>` : ""}
        </div>
      `;
    })
    .join("");

  return `
    <p>${greeting}</p>
    <p>Thanks for coming out to the ${esc(payload.eventName)}! Here's how to reach everyone from tonight, in case you didn't get a chance to save it in the room:</p>
    ${cardRows}
    ${
      payload.communityLinks
        ? `<p>Join the <a href="${esc(payload.communityLinks.facebookUrl)}">Facebook group</a> to keep the conversation going, and check out <a href="${esc(payload.communityLinks.websiteUrl)}">${esc(payload.communityLinks.websiteUrl.replace(/^https?:\/\//, ""))}</a> for more.</p>`
        : ""
    }
    <p>Thanks again for being part of it - hope to see you at the next one!</p>
    ${payload.eventsUrl ? `<p><a href="${esc(payload.eventsUrl)}">See more upcoming events →</a></p>` : ""}
    <p>— Caitlyn</p>
  `;
}
