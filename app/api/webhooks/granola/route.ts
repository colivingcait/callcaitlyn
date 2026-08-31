import { NextResponse, type NextRequest } from "next/server";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseGranolaEvent } from "@/lib/granola/parse-event";
import { matchByCalendarEventId, matchByAttendeeEmail } from "@/lib/crm/meeting-match";
import { createOrGetTranscript, runExtraction } from "@/lib/data/meeting-transcripts";
import type { TranscriptParticipant } from "@/types/database";

const OWNER_ID = process.env.CRM_OWNER_USER_ID;

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // Granola is pointed straight at this URL from its own settings - no
  // Zapier/Make relay, so there's no signing header to verify either.
  // Same secret-in-URL pattern as Eventbrite/Jotform.
  const secret = request.nextUrl.searchParams.get("secret");
  if (!process.env.GRANOLA_WEBHOOK_SECRET || secret !== process.env.GRANOLA_WEBHOOK_SECRET) {
    console.error("Granola webhook rejected: missing/incorrect secret");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!OWNER_ID) {
    console.error("Granola webhook received but CRM_OWNER_USER_ID is not configured");
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
    const event = parseGranolaEvent(body);

    if (!event.noteId) {
      // No stable id means no reliable dedupe - log the raw payload so we
      // can see Granola's real field name for this and fix parse-event.ts.
      console.error("Granola webhook missing a note id - check the payload shape", body);
      return NextResponse.json({ error: "missing note id" }, { status: 400 });
    }
    if (!event.transcript) {
      // Granola can fire more than one event per note (created, updated,
      // shared) - only the one carrying a transcript is worth extracting
      // from. Earlier ones just get skipped here, not stored as failures.
      console.log("Granola webhook with no transcript yet, skipping", event.noteId);
      return NextResponse.json({ received: true });
    }

    // A video meeting (Zoom/Meet/Teams) carries a calendar event id the
    // same way a Tactiq meeting did - match on that first. An in-person
    // coffee or a phone call has neither, and falls through to the
    // attendee-email match, then to the Notes inbox if that also misses
    // (contactId stays null - see the guard below).
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
        const matchedId = await matchByAttendeeEmail(admin, OWNER_ID, [p.email]);
        return { name: p.name, email: p.email, isContact: !!matchedId, contactId: matchedId };
      }),
    );

    const { id: transcriptId, wasCreated } = await createOrGetTranscript(admin, {
      ownerId: OWNER_ID,
      contactId,
      source: "granola",
      externalId: event.noteId,
      rawPayload: body,
      participants,
      durationSeconds: null,
      occurredAt: event.occurredAt,
    });

    if (!wasCreated) return NextResponse.json({ received: true });

    // Unmatched (in-person coffee, phone call, or a video meeting nobody
    // recognized) - still saved, surfaces in the Notes inbox once that
    // ships, nothing lost either way.
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
    console.error("Error processing Granola webhook", err);
    return NextResponse.json({ received: true });
  }
}
