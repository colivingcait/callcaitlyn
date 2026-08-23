import type { SupabaseClient } from "@supabase/supabase-js";
import { findOrCreateContact, addTagByName } from "@/lib/crm/find-or-create-contact";
import { upsertActivity } from "@/lib/crm/activities";
import { recordEventAttendance } from "@/lib/crm/events";
import { applyJourneyStageAnswer } from "@/lib/crm/journey-stage";

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

// Shared between the live webhook (one submission, fires as it happens)
// and the manual backfill (many submissions, uses each one's real
// occurredAt instead of "now" so historical reports bucket correctly) -
// both need identical contact/tag/activity handling.
export async function processJotformSubmission(
  admin: SupabaseClient,
  ownerId: string,
  submission: JotformSubmissionInput,
  formEvent: { eventName: string; tag: string } | undefined,
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

  const eventName = formEvent?.eventName ?? "In-person meetup";

  await addTagByName(admin, ownerId, contact.id, "Meetup");
  if (formEvent) await addTagByName(admin, ownerId, contact.id, formEvent.tag);
  await applyJourneyStageAnswer(admin, ownerId, contact.id, submission.journeyStage, contact.wasCreated);

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
      event_name: eventName,
      journey_stage: submission.journeyStage,
      how_heard: submission.howHeard,
      raw_pretty: submission.pretty,
    },
  });

  await recordEventAttendance(admin, contact.id, eventName, occurredAt);

  return true;
}
