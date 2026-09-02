"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createMeetingInvite } from "@/lib/google/calendar";
import { sendQuoText } from "@/lib/quo/send-message";
import { upsertActivity } from "@/lib/crm/activities";
import { updateEngagementTag } from "@/lib/crm/engagement";
import { notifyNewLead } from "@/lib/push/send-push";
import { buildBookingConfirmedMessage } from "@/lib/crm/booking-message";

// Public, unauthenticated by design - she texted this link to the
// visitor, not the logged-in agent. Same pattern as app/n/[slug]/actions.ts
// and app/book/booking-actions.ts: every write here goes through the
// admin client scoped to the single owner account, gated by the token
// itself rather than a session.
const OWNER_ID = process.env.CRM_OWNER_USER_ID;
const TOKEN_FORMAT = /^[A-Za-z0-9_-]{8}$/;

export type ProposedTimeView = { visitorFirstName: string; proposedStartsAt: string };

export async function getProposedTime(token: string): Promise<ProposedTimeView | null> {
  if (!OWNER_ID || !TOKEN_FORMAT.test(token)) return null;

  const admin = createAdminClient();
  const { data: request } = await admin
    .from("booking_requests")
    .select("visitor_name, proposed_starts_at, stage")
    .eq("owner_id", OWNER_ID)
    .eq("propose_token", token)
    .maybeSingle();
  if (!request || request.stage !== "time_proposed" || !request.proposed_starts_at) return null;

  return { visitorFirstName: request.visitor_name.split(" ")[0] || request.visitor_name, proposedStartsAt: request.proposed_starts_at };
}

export async function confirmProposedTime(token: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!OWNER_ID || !TOKEN_FORMAT.test(token)) return { ok: false, error: "This link isn't valid." };

  const admin = createAdminClient();
  const { data: request } = await admin.from("booking_requests").select("*").eq("owner_id", OWNER_ID).eq("propose_token", token).maybeSingle();
  if (!request || request.stage !== "time_proposed" || !request.proposed_starts_at || !request.proposed_ends_at) {
    return { ok: false, error: "This link isn't active anymore." };
  }

  const durationMinutes = Math.round((new Date(request.proposed_ends_at).getTime() - new Date(request.proposed_starts_at).getTime()) / 60_000);
  const invite = await createMeetingInvite(admin, OWNER_ID, {
    attendeeEmail: request.visitor_email,
    attendeeName: request.visitor_name,
    title: `Meeting with ${request.visitor_name}`,
    startAt: request.proposed_starts_at,
    durationMinutes: durationMinutes > 0 ? durationMinutes : 30,
  });
  if (!invite.ok) return { ok: false, error: invite.error };

  const { error } = await admin
    .from("booking_requests")
    .update({
      starts_at: request.proposed_starts_at,
      ends_at: request.proposed_ends_at,
      stage: "approved",
      google_event_id: invite.eventId,
      decided_at: new Date().toISOString(),
      propose_token: null,
    })
    .eq("id", request.id);
  if (error) return { ok: false, error: error.message };

  const message = buildBookingConfirmedMessage({
    visitorFirstName: request.visitor_name.split(" ")[0] || request.visitor_name,
    startsAt: request.proposed_starts_at,
    meetLink: invite.meetLink,
  });
  const sent = await sendQuoText(request.visitor_phone, message);
  if (sent.ok && request.contact_id) {
    await upsertActivity(admin, OWNER_ID, request.contact_id, "quo", "quo_message_id", sent.quoMessageId, {
      type: "text",
      direction: "outbound",
      occurred_at: new Date().toISOString(),
      body: message,
      metadata: { quo_message_id: sent.quoMessageId, sent_from_crm: true },
    });
    await updateEngagementTag(admin, OWNER_ID, request.contact_id);

    await upsertActivity(admin, OWNER_ID, request.contact_id, "scheduling", "booking_request_id", request.id, {
      type: "meeting",
      direction: "none",
      occurred_at: request.proposed_starts_at,
      body: "Booked via proposed-time confirmation",
      metadata: { google_event_id: invite.eventId, meet_link: invite.meetLink, booking_request_id: request.id },
    });
  }

  await notifyNewLead(admin, OWNER_ID, {
    title: request.visitor_name,
    body: "Confirmed the new time - it's on your calendar",
    url: "/scheduling",
  });

  return { ok: true };
}
