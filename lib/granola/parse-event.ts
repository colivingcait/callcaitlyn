// Granola's own account settings let her point a webhook straight at us -
// no Zapier/Make relay in between, so unlike Tactiq this parses Granola's
// actual native payload shape rather than one we invented for her to map
// into. That shape isn't confirmed against a real delivery yet (Granola's
// public docs describe the fields loosely: note id, title, attendees,
// transcript, calendar event), so every field is read defensively across a
// few plausible key-name variants, and the route logs the full raw body
// whenever something required is missing - the same "log it so we can fix
// the guess" approach used for Quo's signature header.
export type GranolaNoteEvent = {
  noteId: string;
  title: string;
  transcript: string;
  occurredAt: string;
  calendarEventId: string | null;
  participants: { name: string | null; email: string | null }[];
};

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function pick(body: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (body[key] !== undefined && body[key] !== null) return body[key];
  }
  return undefined;
}

export function parseGranolaEvent(body: Record<string, unknown>): GranolaNoteEvent {
  const rawAttendees = pick(body, "attendees", "participants");
  const attendeeList = Array.isArray(rawAttendees) ? rawAttendees : [];
  const participants = attendeeList
    .map((p) => {
      if (typeof p === "string") return { name: null, email: asString(p) ?? null };
      if (p && typeof p === "object") {
        const obj = p as Record<string, unknown>;
        return { name: asString(pick(obj, "name", "display_name")), email: asString(pick(obj, "email", "email_address")) };
      }
      return null;
    })
    .filter((p): p is { name: string | null; email: string | null } => !!p);

  return {
    noteId: asString(pick(body, "note_id", "noteId", "id")) ?? "",
    title: asString(pick(body, "title", "meeting_title")) ?? "Meeting",
    transcript: asString(pick(body, "transcript", "transcript_text")) ?? "",
    occurredAt: asString(pick(body, "start_time", "startTime", "date", "created_at")) ?? new Date().toISOString(),
    calendarEventId: asString(pick(body, "calendar_event_id", "calendarEventId")),
    participants,
  };
}
