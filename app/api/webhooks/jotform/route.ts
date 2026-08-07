import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseJotformSubmission } from "@/lib/jotform/parse-event";
import { findOrCreateContact, addTagByName } from "@/lib/crm/find-or-create-contact";
import { upsertActivity } from "@/lib/crm/activities";
import { recordEventAttendance } from "@/lib/crm/events";

const OWNER_ID = process.env.CRM_OWNER_USER_ID;

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
    });

    if (!contact) {
      console.warn("Jotform webhook: no email/phone to match or create a contact", submission);
      return NextResponse.json({ received: true });
    }

    await addTagByName(admin, OWNER_ID, contact.id, "Meetup");

    const occurredAt = new Date().toISOString();
    const bodyParts = ["Checked in at an in-person meetup (Jotform kiosk)"];
    if (submission.journeyStage) bodyParts.push(`House hacking journey: ${submission.journeyStage}`);

    await upsertActivity(admin, OWNER_ID, contact.id, "jotform", "jotform_submission_id", submission.submissionId, {
      type: "meeting",
      direction: "none",
      occurred_at: occurredAt,
      body: bodyParts.join(" — "),
      metadata: {
        jotform_submission_id: submission.submissionId,
        journey_stage: submission.journeyStage,
        how_heard: submission.howHeard,
        raw_pretty: submission.pretty,
      },
    });

    await recordEventAttendance(admin, contact.id, "In-person meetup", occurredAt);

    // Journey-stage -> pipeline-stage mapping isn't wired up yet - the
    // answer is captured above (activity + metadata.journey_stage) but
    // doesn't move the contact's stage automatically. Needs the exact
    // answer options confirmed before mapping them to real stages.
  } catch (err) {
    console.error("Error processing Jotform webhook", err);
  }

  return NextResponse.json({ received: true });
}
