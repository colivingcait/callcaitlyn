type AnyRecord = Record<string, unknown>;

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

export type ParsedEventbriteAttendee = {
  attendeeId: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  journeyStage: string | null;
};

function findJourneyStageAnswer(answers: unknown): string | null {
  if (!Array.isArray(answers)) return null;
  const match = (answers as AnyRecord[]).find((a) => {
    const question = asString(a.question)?.toLowerCase() ?? "";
    return question.includes("journey") || question.includes("house hacking");
  });
  return asString(match?.answer);
}

export function parseEventbriteAttendees(order: AnyRecord): ParsedEventbriteAttendee[] {
  const attendees = order.attendees as AnyRecord[] | undefined;
  if (!Array.isArray(attendees) || attendees.length === 0) {
    // Fall back to the order's own buyer info if no attendee list came back.
    const profile = order.profile as AnyRecord | undefined;
    const email = asString(order.email) ?? asString(profile?.email);
    if (!email) return [];
    return [
      {
        attendeeId: asString(order.id),
        email,
        firstName: asString(order.first_name) ?? asString(profile?.first_name),
        lastName: asString(order.last_name) ?? asString(profile?.last_name),
        phone: asString(order.cell_phone) ?? asString(profile?.cell_phone),
        journeyStage: findJourneyStageAnswer(order.answers),
      },
    ];
  }

  return attendees.map((attendee) => {
    const profile = attendee.profile as AnyRecord | undefined;
    return {
      attendeeId: asString(attendee.id),
      email: asString(profile?.email),
      firstName: asString(profile?.first_name),
      lastName: asString(profile?.last_name),
      phone: asString(profile?.cell_phone),
      journeyStage: findJourneyStageAnswer(attendee.answers),
    };
  });
}
