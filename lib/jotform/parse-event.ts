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

export function parseJotformSubmission(formData: FormData): ParsedJotformSubmission {
  const submissionId = (formData.get("submissionID") as string | null) ?? null;
  const pretty = (formData.get("pretty") as string | null) ?? null;

  if (!pretty) {
    return { submissionId, name: null, email: null, phone: null, howHeard: null, journeyStage: null, pretty: null };
  }

  const pairs = splitPretty(pretty);

  return {
    submissionId,
    name: findByLabel(pairs, "name"),
    email: findByLabel(pairs, "email"),
    phone: findByLabel(pairs, "phone"),
    howHeard: findByLabel(pairs, "hear"),
    journeyStage: findByLabel(pairs, "journey", "stage"),
    pretty,
  };
}
