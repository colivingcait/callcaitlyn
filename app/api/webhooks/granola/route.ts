import { NextResponse, type NextRequest } from "next/server";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseGranolaEvent } from "@/lib/granola/parse-event";
import { matchByCalendarEventId, matchByAttendeeEmail } from "@/lib/crm/meeting-match";
import { findNameCandidates, matchByRememberedName, getGranolaMatchingRules } from "@/lib/crm/note-name-match";
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
    // Confirmed from a real delivery: Granola's own connectivity check from
    // its webhook settings page ("Test it" there, not this app's Settings
    // button) sends {event_type: "webhook.test", event_id, occurred_at} -
    // no note_id, on purpose, since it isn't about a real note. Treating
    // that as a malformed payload made Granola's own dashboard show every
    // connectivity test as a failure.
    if (body.event_type === "webhook.test") {
      return NextResponse.json({ received: true });
    }

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
      // from, so this is expected to fire on the earlier ones. But it's
      // also exactly what happens if the transcript field name guess in
      // parse-event.ts is wrong for a real Granola payload - logging only
      // the note id gave no way to tell those two cases apart. Logging the
      // full raw body here too (same as the missing-note-id case above)
      // means the next real delivery hands us the actual field name to
      // fix, instead of another round of guessing.
      console.log("Granola webhook with no transcript field found - check the payload shape if this note should have one", event.noteId, body);
      return NextResponse.json({ received: true });
    }

    const rules = await getGranolaMatchingRules(admin, OWNER_ID);

    // A video meeting (Zoom/Meet/Teams) carries a calendar event id the
    // same way a Tactiq meeting did - match on that first (toggle-gated).
    // An in-person coffee or a phone call has neither, and falls through
    // to the attendee-email match, then a remembered "That's her" name,
    // then a live name-in-note match if exactly one contact's full name
    // shows up in the transcript (also toggle-gated - an ambiguous 2+
    // match is deliberately left unmatched for the Notes inbox to ask
    // about, never auto-resolved to a guess).
    let contactId =
      (rules.match_on_calendar_event && event.calendarEventId ? await matchByCalendarEventId(admin, OWNER_ID, event.calendarEventId) : null) ??
      (await matchByAttendeeEmail(
        admin,
        OWNER_ID,
        event.participants.map((p) => p.email).filter((e): e is string => !!e),
      )) ??
      (await matchByRememberedName(admin, OWNER_ID, event.transcript));

    if (!contactId && rules.match_on_name_when_single) {
      const { data: contacts } = await admin.from("contacts").select("id, first_name, last_name").eq("owner_id", OWNER_ID).eq("archived", false);
      const candidates = findNameCandidates(contacts ?? [], event.transcript);
      if (candidates.length === 1) contactId = candidates[0].id;
    }

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
      durationSeconds: event.durationSeconds,
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
