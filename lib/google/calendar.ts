import { google } from "googleapis";
import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthorizedGoogleClient } from "@/lib/google/oauth";

export type CreateMeetingInput = {
  attendeeEmail: string;
  attendeeName: string;
  title: string;
  description?: string;
  startAt: string; // ISO
  durationMinutes: number;
};

export type CreateMeetingResult =
  | { ok: true; eventId: string; meetLink: string | null; htmlLink: string | null }
  | { ok: false; error: string };

// Google only attaches a Meet link to an event that explicitly requests
// conference data (conferenceDataVersion + a hangoutsMeet createRequest) -
// a plain calendar event has no video link at all. sendUpdates: "all" is
// what actually emails the invite to the attendee; without it the event is
// created silently and only she'd ever see it on her own calendar.
export async function createMeetingInvite(admin: SupabaseClient, ownerId: string, input: CreateMeetingInput): Promise<CreateMeetingResult> {
  const client = await getAuthorizedGoogleClient(admin, ownerId);
  if (!client) return { ok: false, error: "Google isn't connected. Connect it in Settings first." };

  const calendar = google.calendar({ version: "v3", auth: client });
  const start = new Date(input.startAt);
  const end = new Date(start.getTime() + input.durationMinutes * 60_000);

  try {
    const { data } = await calendar.events.insert({
      calendarId: "primary",
      sendUpdates: "all",
      conferenceDataVersion: 1,
      requestBody: {
        summary: input.title,
        description: input.description,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        attendees: [{ email: input.attendeeEmail, displayName: input.attendeeName }],
        conferenceData: {
          createRequest: {
            requestId: randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
    });

    const meetLink = data.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ?? null;
    return { ok: true, eventId: data.id ?? "", meetLink, htmlLink: data.htmlLink ?? null };
  } catch (err) {
    console.error("Google Calendar event creation failed", err);
    const message = err instanceof Error ? err.message : "Failed to create the meeting";
    // The calendar scope was added after Gmail was already connected for
    // some accounts, so a stored token might still be missing it - Google
    // surfaces that as a 403/"insufficient authentication scopes" error,
    // which reads as a random failure unless it's translated. Reconnecting
    // (not retrying) is the actual fix.
    const insufficientScope = /insufficient|scope|403/i.test(message);
    return { ok: false, error: insufficientScope ? "Google needs to be reconnected in Settings to allow calendar invites." : message };
  }
}
