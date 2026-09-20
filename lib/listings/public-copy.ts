// Display-only cleanup for the public OM. Production listing rows can
// carry CRM-draft leftovers (placeholder story, a PadSplit typo) that
// should never render on the public page.

const PLACEHOLDER = /^(testing[\s.]*)+$/i;

export function correctPadsplitSpelling(value: string): string {
  return value.replace(/Padpslit/gi, "PadSplit");
}

export function listingFieldCopy(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return correctPadsplitSpelling(trimmed);
}

export function publicListingCopy(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (PLACEHOLDER.test(trimmed) || /^lorem ipsum/i.test(trimmed) || /^placeholder\b/i.test(trimmed)) return null;
  return correctPadsplitSpelling(trimmed);
}
