// Tactiq's own webhook payload shape isn't something this integration
// controls or has confirmed against a real delivery - she's connecting it
// through a Make.com scenario (Tactiq trigger -> HTTP POST module), which
// means SHE builds the outbound JSON body by mapping Tactiq's fields into
// whatever keys we ask for. So rather than guess Tactiq's native field
// names, this defines the shape we want and she maps into it - see the
// Settings row (components/settings/TactiqConnect.tsx) for the exact
// field-mapping instructions shown to her.
export type TactiqMeetingEvent = {
  meetingId: string;
  title: string;
  transcript: string;
  occurredAt: string;
  durationSeconds: number | null;
  calendarEventId: string | null;
  participants: { name: string | null; email: string | null }[];
};

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function asNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

// Every optional/uncertain field falls back sensibly rather than throwing -
// a Zap that's missing a mapping shouldn't drop the whole meeting, just
// arrive a little less complete. meetingId is the one field this can't
// fully recover from missing (see the route's own comment on that).
export function parseTactiqEvent(body: Record<string, unknown>): TactiqMeetingEvent {
  const rawParticipants = Array.isArray(body.participants) ? body.participants : [];
  const participants = rawParticipants
    .map((p) => {
      if (typeof p === "string") return { name: asString(p), email: null };
      if (p && typeof p === "object") {
        const obj = p as Record<string, unknown>;
        return { name: asString(obj.name), email: asString(obj.email) };
      }
      return null;
    })
    .filter((p): p is { name: string | null; email: string | null } => !!p);

  return {
    meetingId: asString(body.meeting_id) ?? asString(body.meetingId) ?? "",
    title: asString(body.title) ?? "Meeting",
    transcript: asString(body.transcript) ?? "",
    occurredAt: asString(body.occurred_at) ?? asString(body.occurredAt) ?? new Date().toISOString(),
    durationSeconds: asNumber(body.duration_seconds) ?? asNumber(body.durationSeconds),
    calendarEventId: asString(body.calendar_event_id) ?? asString(body.calendarEventId),
    participants,
  };
}
