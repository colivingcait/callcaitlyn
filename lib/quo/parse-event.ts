// Best-effort parsing of Quo (formerly OpenPhone) webhook payloads. Field
// names follow their documented conventions but haven't been confirmed
// against a real delivery yet - see README's Quo section. The full raw
// body is always preserved on the activity's `metadata.raw` so nothing is
// lost even if a field guess here is wrong; we can backfill once confirmed.

type AnyRecord = Record<string, unknown>;

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function firstOf(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return null;
}

export type ParsedQuoCall = {
  quoCallId: string | null;
  direction: "inbound" | "outbound" | "none";
  counterpartNumber: string | null;
  durationSeconds: number | null;
  status: string | null;
  occurredAt: string;
  recordingUrl: string | null;
  summary: string | null;
  transcript: string | null;
};

export type ParsedQuoMessage = {
  quoMessageId: string | null;
  direction: "inbound" | "outbound" | "none";
  counterpartNumber: string | null;
  text: string | null;
  occurredAt: string;
};

function unwrap(body: AnyRecord): AnyRecord {
  const data = body.data as AnyRecord | undefined;
  return (data?.object as AnyRecord) ?? data ?? body;
}

function rawDirection(obj: AnyRecord): "inbound" | "outbound" | "none" {
  const d = asString(obj.direction);
  if (d === "incoming" || d === "inbound") return "inbound";
  if (d === "outgoing" || d === "outbound") return "outbound";
  return "none";
}

export function parseQuoCall(body: AnyRecord): ParsedQuoCall {
  const obj = unwrap(body);
  const direction = rawDirection(obj);
  const from = asString(obj.from) ?? firstOf((obj.participants as AnyRecord | undefined)?.from);
  const to = asString(obj.to) ?? firstOf(obj.to) ?? firstOf((obj.participants as AnyRecord | undefined)?.to);
  const media = obj.media as AnyRecord[] | undefined;
  const recording = obj.recording as AnyRecord | undefined;
  const transcript = obj.transcript as unknown;

  return {
    quoCallId: asString(obj.id),
    direction,
    counterpartNumber: direction === "outbound" ? to : from,
    durationSeconds: typeof obj.duration === "number" ? obj.duration : null,
    status: asString(obj.status),
    occurredAt: asString(obj.completedAt) ?? asString(obj.createdAt) ?? new Date().toISOString(),
    recordingUrl: asString(media?.[0]?.url) ?? asString(recording?.url) ?? asString(obj.recordingUrl),
    summary: asString(obj.summary) ?? asString(obj.aiSummary),
    transcript: parseTranscript(transcript),
  };
}

function parseTranscript(transcript: unknown): string | null {
  if (typeof transcript === "string") return transcript;
  if (transcript && typeof transcript === "object") {
    const obj = transcript as AnyRecord;
    if (typeof obj.text === "string") return obj.text;
    const dialogue = (obj.dialogue ?? obj.segments ?? obj.utterances) as AnyRecord[] | undefined;
    if (Array.isArray(dialogue)) {
      return dialogue
        .map((turn) => {
          const speaker = asString(turn.speaker) ?? asString(turn.identifier);
          const content = asString(turn.content) ?? asString(turn.text);
          return speaker && content ? `${speaker}: ${content}` : content;
        })
        .filter(Boolean)
        .join("\n");
    }
  }
  return null;
}

export function parseQuoMessage(body: AnyRecord): ParsedQuoMessage {
  const obj = unwrap(body);
  const direction = rawDirection(obj);
  const from = asString(obj.from);
  const to = asString(obj.to) ?? firstOf(obj.to);

  return {
    quoMessageId: asString(obj.id),
    direction,
    counterpartNumber: direction === "outbound" ? to : from,
    text: asString(obj.text) ?? asString(obj.body),
    occurredAt: asString(obj.createdAt) ?? new Date().toISOString(),
  };
}
