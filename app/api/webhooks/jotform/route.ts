import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseJotformSubmission } from "@/lib/jotform/parse-event";
import { processJotformSubmission, type JotformFormEvent } from "@/lib/jotform/process-submission";

const OWNER_ID = process.env.CRM_OWNER_USER_ID;

// Two physical kiosk forms (House Hacking meetups, Women's REI meetups)
// share this one webhook - Jotform sends the source form's ID on every
// submission, so mapping it to a name/tag here is enough to tell them
// apart without needing two separate webhook URLs or secrets. An
// unmapped form ID (nothing configured yet, or a third form later) falls
// back to a generic label rather than failing.
const FORM_EVENTS: Record<string, JotformFormEvent> = {
  ...(process.env.JOTFORM_HOUSE_HACKING_FORM_ID
    ? { [process.env.JOTFORM_HOUSE_HACKING_FORM_ID]: { eventName: "House Hacking Meetup", tag: "House Hacking", eventbriteAccount: "house_hacking" } }
    : {}),
  ...(process.env.JOTFORM_WOMENS_REI_FORM_ID
    ? { [process.env.JOTFORM_WOMENS_REI_FORM_ID]: { eventName: "Women's REI Meetup", tag: "Women's REI", eventbriteAccount: "womens_rei" } }
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
    const formEvent = submission.formId ? FORM_EVENTS[submission.formId] : undefined;
    const contactFound = await processJotformSubmission(admin, OWNER_ID, submission, formEvent, new Date().toISOString());
    if (!contactFound) {
      console.warn("Jotform webhook: no email/phone to match or create a contact", submission);
    }
  } catch (err) {
    console.error("Error processing Jotform webhook", err);
  }

  return NextResponse.json({ received: true });
}
