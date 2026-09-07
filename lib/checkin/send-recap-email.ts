import type { SupabaseClient } from "@supabase/supabase-js";
import { sendGmailMessage } from "@/lib/google/send-email";
import { upsertActivity } from "@/lib/crm/activities";
import { hasPlaceholderName } from "@/lib/crm/merge-fields";
import { renderCheckinRecapEmail } from "@/lib/crm/checkin-recap-email";
import { CONTACT_CARDS, SERIES_EVENTS_URL, SERIES_COMMUNITY_LINKS } from "@/lib/checkin/contact-cards";
import type { EventSeriesKey } from "@/lib/crm/nearest-event";

// Best-effort, non-blocking: a Gmail hiccup (not connected, rate limited,
// token expired) should never fail the check-in itself - the attendee is
// already checked in and that's the part that matters in the room. Called
// once per genuine (non-duplicate) check-in from processCheckIn.
export async function sendCheckinRecapEmail(
  admin: SupabaseClient,
  ownerId: string,
  contact: { id: string; email: string | null; phone: string | null; first_name: string | null },
  series: EventSeriesKey,
  eventName: string,
) {
  if (!contact.email) return;

  try {
    const firstName = hasPlaceholderName({ first_name: contact.first_name ?? "", phone: contact.phone, email: contact.email }) ? null : contact.first_name;

    const html = renderCheckinRecapEmail({
      firstName,
      eventName,
      cards: CONTACT_CARDS[series],
      eventsUrl: SERIES_EVENTS_URL[series],
      communityLinks: SERIES_COMMUNITY_LINKS[series],
    });

    const result = await sendGmailMessage(admin, ownerId, contact.email, `Thanks for coming to the ${eventName}!`, html);
    if (!result.ok) {
      console.error("Check-in recap email failed", result.error);
      return;
    }

    await upsertActivity(admin, ownerId, contact.id, "gmail", "gmail_message_id", result.messageId, {
      type: "email",
      direction: "outbound",
      occurred_at: new Date().toISOString(),
      body: `Thanks for coming to the ${eventName}!`,
      metadata: { gmail_message_id: result.messageId, checkin_recap: true, series },
    });
  } catch (err) {
    console.error("Check-in recap email failed", err);
  }
}
