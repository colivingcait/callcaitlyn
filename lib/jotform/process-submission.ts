import type { SupabaseClient } from "@supabase/supabase-js";
import { findOrCreateContact, addTagByName } from "@/lib/crm/find-or-create-contact";
import { upsertActivity } from "@/lib/crm/activities";
import { recordEventAttendance } from "@/lib/crm/events";
import { applyJourneyStageAnswer } from "@/lib/crm/journey-stage";
import { resolveNearestEbEvent } from "@/lib/crm/nearest-event";
import { recordConsent } from "@/lib/crm/consent";
import { formatLocal } from "@/lib/format-time";

export type JotformSubmissionInput = {
  submissionId: string | null;
  formId: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  howHeard: string | null;
  journeyStage: string | null;
  pretty: string | null;
};

export type JotformFormEvent = {
  eventName: string;
  tag: string;
  // Which Eventbrite series this kiosk form's checkins belong to - lets a
  // check-in link to the specific Eventbrite event_id actually happening
  // around this time, not just a generic recurring-meetup label. See
  // resolveNearestEbEvent below.
  eventbriteAccount: "house_hacking" | "womens_rei";
};

// Shared between the live webhook (one submission, fires as it happens)
// and the manual backfill (many submissions, uses each one's real
// occurredAt instead of "now" so historical reports bucket correctly) -
// both need identical contact/tag/activity handling.
export async function processJotformSubmission(
  admin: SupabaseClient,
  ownerId: string,
  submission: JotformSubmissionInput,
  formEvent: JotformFormEvent | undefined,
  occurredAt: string,
): Promise<boolean> {
  const [firstName, ...lastNameParts] = (submission.name ?? "").trim().split(/\s+/);

  const contact = await findOrCreateContact(admin, ownerId, {
    email: submission.email,
    phone: submission.phone,
    firstName: firstName || null,
    lastName: lastNameParts.join(" ") || null,
    leadSource: submission.howHeard ?? "Jotform (in-person event)",
    contactType: "attendee",
  });

  if (!contact) return false;

  const nearestEvent = formEvent
    ? await resolveNearestEbEvent(admin, ownerId, formEvent.eventbriteAccount, occurredAt)
    : { eventId: null, eventName: null };
  const eventName = nearestEvent.eventName ?? formEvent?.eventName ?? "In-person meetup";

  await addTagByName(admin, ownerId, contact.id, "Meetup");
  if (formEvent) await addTagByName(admin, ownerId, contact.id, formEvent.tag);
  await applyJourneyStageAnswer(admin, ownerId, contact.id, submission.journeyStage, contact.wasCreated);
  await recordConsent(admin, contact.id, `checked in at ${eventName}, ${formatLocal(occurredAt, "MMM d")}`);

  const bodyParts = [`Checked in at ${eventName} (Jotform kiosk)`];
  if (submission.journeyStage) bodyParts.push(`House hacking journey: ${submission.journeyStage}`);

  await upsertActivity(admin, ownerId, contact.id, "jotform", "jotform_submission_id", submission.submissionId, {
    type: "meeting",
    direction: "none",
    occurred_at: occurredAt,
    body: bodyParts.join(" — "),
    metadata: {
      jotform_submission_id: submission.submissionId,
      jotform_form_id: submission.formId,
      // The reliable series signal - which physical kiosk form was
      // submitted, unambiguous and never guessed from text. event_name
      // below is just a human-readable label (the real Eventbrite event's
      // title when we found one) and must never be used to classify which
      // meetup this belongs to - see events-report.ts's getSeriesFor.
      series: formEvent?.eventbriteAccount ?? null,
      event_id: nearestEvent.eventId,
      event_name: eventName,
      journey_stage: submission.journeyStage,
      how_heard: submission.howHeard,
      raw_pretty: submission.pretty,
    },
  });

  await recordEventAttendance(admin, contact.id, eventName, occurredAt);

  return true;
}
