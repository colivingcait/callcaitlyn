// Jotform posts submissions as multipart/form-data, not JSON. The most
// reliable field to parse is `pretty` - a human-readable
// "Label:Answer, Label2:Answer2" string - since it doesn't depend on
// knowing the form's internal field IDs (which vary per form and aren't
// predictable from here). Matching labels to our fields is fuzzy
// (case-insensitive substring) since exact label wording isn't confirmed.
// The full raw pretty string is always kept in the activity's
// metadata.raw so nothing is lost if a label guess misses.

export type ParsedJotformSubmission = {
  submissionId: string | null;
  formId: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  howHeard: string | null;
  journeyStage: string | null;
  pretty: string | null;
};

function splitPretty(pretty: string): { label: string; value: string }[] {
  // Split on ", " only when followed by something that looks like the
  // start of the next "Label:" pair, so commas inside an answer don't
  // break the split.
  const segments = pretty.split(/,\s+(?=[^,:]+:)/);
  return segments
    .map((segment) => {
      const idx = segment.indexOf(":");
      if (idx === -1) return null;
      return { label: segment.slice(0, idx).trim(), value: segment.slice(idx + 1).trim() };
    })
    .filter((x): x is { label: string; value: string } => x !== null);
}

function findByLabel(pairs: { label: string; value: string }[], ...keywords: string[]) {
  const match = pairs.find((p) => {
    const lower = p.label.toLowerCase();
    return keywords.some((kw) => lower.includes(kw));
  });
  return match?.value || null;
}

// Shared by the live webhook (parses a `pretty` string) and the backfill
// (parses the API's `answers` object into the same {label, value} pairs
// first - see lib/jotform/client.ts) so both paths extract fields with
// identical fuzzy label-matching and never drift apart.
export function extractFieldsFromPairs(pairs: { label: string; value: string }[]) {
  return {
    name: findByLabel(pairs, "name"),
    email: findByLabel(pairs, "email"),
    phone: findByLabel(pairs, "phone"),
    howHeard: findByLabel(pairs, "hear"),
    journeyStage: findByLabel(pairs, "journey", "stage"),
  };
}

export function parseJotformSubmission(formData: FormData): ParsedJotformSubmission {
  const submissionId = (formData.get("submissionID") as string | null) ?? null;
  // Jotform includes the source form's ID on every submission regardless
  // of which form it came from - lets one shared webhook tell two
  // different kiosk forms (e.g. House Hacking vs Women's REI check-in)
  // apart. See JOTFORM_*_FORM_ID in the webhook route.
  const formId = (formData.get("formID") as string | null) ?? null;
  const pretty = (formData.get("pretty") as string | null) ?? null;

  if (!pretty) {
    return { submissionId, formId, name: null, email: null, phone: null, howHeard: null, journeyStage: null, pretty: null };
  }

  const pairs = splitPretty(pretty);

  return {
    submissionId,
    formId,
    ...extractFieldsFromPairs(pairs),
    pretty,
  };
}
