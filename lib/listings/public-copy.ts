// Display-only cleanup for the public OM. Production listing rows can
// carry CRM-draft leftovers (placeholder story, a PadSplit typo, missing
// due-diligence integers) that should never render as "undefined-day".

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

export function finiteDays(n: number | string | null | undefined): number | null {
  const value = typeof n === "string" ? Number(n) : n;
  if (value == null || typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return value;
}
