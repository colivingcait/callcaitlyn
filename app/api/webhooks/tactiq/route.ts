import { NextResponse, type NextRequest } from "next/server";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseTactiqEvent } from "@/lib/tactiq/parse-event";
import { matchByCalendarEventId, matchByAttendeeEmail } from "@/lib/crm/meeting-match";
import { createOrGetTranscript, runExtraction } from "@/lib/data/meeting-transcripts";
import type { TranscriptParticipant } from "@/types/database";

const OWNER_ID = process.env.CRM_OWNER_USER_ID;

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // Same secret-in-URL pattern as Eventbrite, not an HMAC header - Zapier's
  // "Webhooks by Zapier" action makes its own outbound request built from
  // whatever the Zap maps, it doesn't forward Tactiq's original signing
  // headers, so a header-based signature scheme isn't reachable through
  // this delivery path.
  const secret = request.nextUrl.searchParams.get("secret");
  if (!process.env.TACTIQ_WEBHOOK_SECRET || secret !== process.env.TACTIQ_WEBHOOK_SECRET) {
    console.error("Tactiq webhook rejected: missing/incorrect secret");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!OWNER_ID) {
    console.error("Tactiq webhook received but CRM_OWNER_USER_ID is not configured");
    return NextResponse.json({ error: "server not configured" }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    const event = parseTactiqEvent(body);

    if (!event.meetingId) {
      // No stable id means no reliable dedupe - log the raw payload so the
      // Zap mapping can be fixed to include one, rather than silently
      // risking a duplicate meeting_transcripts row on a Zapier retry.
      console.error("Tactiq webhook missing meeting_id - check the Zap's field mapping", body);
      return NextResponse.json({ error: "missing meeting_id" }, { status: 400 });
    }
    if (!event.transcript) {
      console.log("Tactiq webhook with no transcript, skipping", event.meetingId);
      return NextResponse.json({ received: true });
    }

    const contactId =
      (event.calendarEventId ? await matchByCalendarEventId(admin, OWNER_ID, event.calendarEventId) : null) ??
      (await matchByAttendeeEmail(
        admin,
        OWNER_ID,
        event.participants.map((p) => p.email).filter((e): e is string => !!e),
      ));

    const participants: TranscriptParticipant[] = await Promise.all(
      event.participants.map(async (p) => {
        if (!p.email) return { name: p.name, email: null, isContact: false, contactId: null };
        const matchedId = p.email ? await matchByAttendeeEmail(admin, OWNER_ID, [p.email]) : null;
        return { name: p.name, email: p.email, isContact: !!matchedId, contactId: matchedId };
      }),
    );

    const { id: transcriptId, wasCreated } = await createOrGetTranscript(admin, {
      ownerId: OWNER_ID,
      contactId,
      source: "tactiq",
      externalId: event.meetingId,
      rawPayload: body,
      participants,
      durationSeconds: event.durationSeconds,
      occurredAt: event.occurredAt,
    });

    if (!wasCreated) return NextResponse.json({ received: true });

    // No matched contact at all (rare for a scheduled video meeting, but
    // possible if it wasn't booked through the CRM and no attendee email
    // matches anyone on file) - stored, unmatched, same as a Granola note
    // with nobody to attach it to. Surfaces once the Notes inbox ships.
    if (!contactId) return NextResponse.json({ received: true });

    const { data: contact } = await admin.from("contacts").select("known_personally").eq("id", contactId).maybeSingle();
    if (contact?.known_personally) {
      await admin.from("meeting_transcripts").update({ status: "no_proposals" }).eq("id", transcriptId);
      return NextResponse.json({ received: true });
    }

    const transcriptText = event.transcript;
    const participantNames = event.participants.map((p) => p.name).filter((n): n is string => !!n);
    after(() => runExtraction(admin, OWNER_ID, transcriptId, contactId, transcriptText, participantNames));

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Error processing Tactiq webhook", err);
    return NextResponse.json({ received: true });
  }
}
