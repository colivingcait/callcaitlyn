import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseJotformSubmission } from "@/lib/jotform/parse-event";
import { findOrCreateContact, addTagByName } from "@/lib/crm/find-or-create-contact";
import { upsertActivity } from "@/lib/crm/activities";
import { recordEventAttendance } from "@/lib/crm/events";
import { applyJourneyStageAnswer } from "@/lib/crm/journey-stage";

const OWNER_ID = process.env.CRM_OWNER_USER_ID;

// Two physical kiosk forms (House Hacking meetups, Women's REI meetups)
// share this one webhook - Jotform sends the source form's ID on every
// submission, so mapping it to a name/tag here is enough to tell them
// apart without needing two separate webhook URLs or secrets. An
// unmapped form ID (nothing configured yet, or a third form later) falls
// back to a generic label rather than failing.
const FORM_EVENTS: Record<string, { eventName: string; tag: string }> = {
  ...(process.env.JOTFORM_HOUSE_HACKING_FORM_ID
    ? { [process.env.JOTFORM_HOUSE_HACKING_FORM_ID]: { eventName: "House Hacking Meetup", tag: "House Hacking" } }
    : {}),
  ...(process.env.JOTFORM_WOMENS_REI_FORM_ID
    ? { [process.env.JOTFORM_WOMENS_REI_FORM_ID]: { eventName: "Women's REI Meetup", tag: "Women's REI" } }
    : {}),
};

export async function POST(request: NextRequest) {
  // Same approach as Eventbrite: Jotform doesn't offer webhook signature
  // verification, so this is secured with a self-chosen secret in the URL.
  const secret = request.nextUrl.searchParams.get("secret");
  if (!process.env.JOTFORM_WEBHOOK_SECRET || secret !== process.env.JOTFORM_WEBHOOK_SECRET) {
    console.error("Jotform webhook rejected: missing/incorrect secret");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!OWNER_ID) {
    console.error("Jotform webhook received but CRM_OWNER_USER_ID is not configured");
    return NextResponse.json({ error: "server not configured" }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    console.error("Jotform webhook: could not parse form data", err);
    return NextResponse.json({ error: "invalid form data" }, { status: 400 });
  }

  const submission = parseJotformSubmission(formData);
  if (!submission.pretty) {
    console.warn("Jotform webhook: no 'pretty' field found", {
      keys: Array.from(formData.keys()),
    });
  }

  const admin = createAdminClient();

  try {
    const [firstName, ...lastNameParts] = (submission.name ?? "").trim().split(/\s+/);

    const contact = await findOrCreateContact(admin, OWNER_ID, {
      email: submission.email,
      phone: submission.phone,
      firstName: firstName || null,
      lastName: lastNameParts.join(" ") || null,
      leadSource: submission.howHeard ?? "Jotform (in-person event)",
      contactType: "attendee",
    });

    if (!contact) {
      console.warn("Jotform webhook: no email/phone to match or create a contact", submission);
      return NextResponse.json({ received: true });
    }

    const formEvent = submission.formId ? FORM_EVENTS[submission.formId] : undefined;
    const eventName = formEvent?.eventName ?? "In-person meetup";

    await addTagByName(admin, OWNER_ID, contact.id, "Meetup");
    if (formEvent) await addTagByName(admin, OWNER_ID, contact.id, formEvent.tag);
    await applyJourneyStageAnswer(admin, OWNER_ID, contact.id, submission.journeyStage, contact.wasCreated);

    const occurredAt = new Date().toISOString();
    const bodyParts = [`Checked in at ${eventName} (Jotform kiosk)`];
    if (submission.journeyStage) bodyParts.push(`House hacking journey: ${submission.journeyStage}`);

    await upsertActivity(admin, OWNER_ID, contact.id, "jotform", "jotform_submission_id", submission.submissionId, {
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
  } catch (err) {
    console.error("Error processing Jotform webhook", err);
  }

  return NextResponse.json({ received: true });
}
