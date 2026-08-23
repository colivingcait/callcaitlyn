import { extractFieldsFromPairs } from "./parse-event";

// Jotform's submissions API, used only by the manual backfill (the live
// webhook gets pushed data directly). Field shapes below follow Jotform's
// documented API but haven't been confirmed against a real response from
// this account - see README's Jotform section. Throws instead of silently
// swallowing errors, same reasoning as Eventbrite's client: the backfill
// button has nowhere to check server logs, so a real rejection reason
// needs to surface in the Settings UI instead of a silent "0 synced".
async function jotformFetchOrThrow(url: string): Promise<Record<string, unknown>> {
  const apiKey = process.env.JOTFORM_API_KEY;
  if (!apiKey) throw new Error("JOTFORM_API_KEY is not configured");

  const separator = url.includes("?") ? "&" : "?";
  const res = await fetch(`${url}${separator}apiKey=${encodeURIComponent(apiKey)}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Jotform API returned ${res.status}: ${text.slice(0, 300) || res.statusText}`);
  }
  return res.json();
}

export type JotformApiSubmission = {
  submissionId: string;
  formId: string;
  createdAt: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  howHeard: string | null;
  journeyStage: string | null;
  pretty: string | null;
};

// A submission's `answer` value isn't always a plain string - composite
// field types (full name, address, etc.) come back as an object. Rather
// than guess every field-type shape, join whatever string sub-values are
// present; the raw JSON is always kept in the caller's metadata too, so
// nothing is silently lost even if this join produces something odd.
function answerToString(answer: unknown): string {
  if (typeof answer === "string") return answer;
  if (typeof answer === "number") return String(answer);
  if (answer && typeof answer === "object") {
    const parts = Object.values(answer as Record<string, unknown>).filter(
      (v): v is string => typeof v === "string" && v.trim().length > 0,
    );
    if (parts.length) return parts.join(" ");
    return JSON.stringify(answer);
  }
  return "";
}

function parseSubmission(raw: Record<string, unknown>): JotformApiSubmission | null {
  const submissionId = typeof raw.id === "string" ? raw.id : null;
  const formId = typeof raw.form_id === "string" ? raw.form_id : null;
  const createdAt = typeof raw.created_at === "string" ? raw.created_at : null;
  if (!submissionId || !formId || !createdAt) return null;

  const answers = (raw.answers ?? {}) as Record<string, { text?: unknown; answer?: unknown }>;
  const pairs = Object.values(answers)
    .filter((a) => typeof a.text === "string" && a.answer !== undefined && a.answer !== null && a.answer !== "")
    .map((a) => ({ label: a.text as string, value: answerToString(a.answer) }));

  return {
    submissionId,
    formId,
    // Jotform's created_at is in its account timezone, not UTC - passed
    // through as-is to new Date() below and by callers, same caveat as
    // any other unconfirmed field on this integration.
    createdAt: new Date(createdAt).toISOString(),
    ...extractFieldsFromPairs(pairs),
    pretty: pairs.map((p) => `${p.label}:${p.value}`).join(", ") || null,
  };
}

// Used for the manual "sync recent check-ins" backfill button - pulls a
// single form's submissions since `since`, newest first, capped at 1000
// per call (Jotform's max page size) so one click can't run away
// indefinitely. Two forms (House Hacking, Women's REI) are fetched
// separately by the caller since each has its own ID.
export async function fetchRecentSubmissions(formId: string, since: string): Promise<JotformApiSubmission[]> {
  const filter = encodeURIComponent(JSON.stringify({ "created_at:gt": since.slice(0, 19).replace("T", " ") }));
  const data = await jotformFetchOrThrow(
    `https://api.jotform.com/form/${formId}/submissions?limit=1000&orderby=created_at&filter=${filter}`,
  );

  const content = data.content as Record<string, unknown>[] | undefined;
  if (!content) return [];

  return content.map(parseSubmission).filter((s): s is JotformApiSubmission => s !== null);
}
