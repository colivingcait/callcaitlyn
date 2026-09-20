// PadSplit listing URLs in this CRM follow the path already used as the
// Marketing placeholder: https://www.padsplit.com/rooms-for-rent/listing/{id}
// Marketing asks only for the numeric listing ID; we store the full URL so
// the existing scraper (scripts/scrape-padsplit.mjs) can page.goto it.

export const PADSPLIT_LISTING_URL_BASE = "https://www.padsplit.com/rooms-for-rent/listing";

export function extractPadsplitListingId(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d+$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    const fromPath = url.pathname.match(/\/listing\/(\d+)/i);
    if (fromPath) return fromPath[1];
  } catch {
    // fall through to a loose path match
  }
  const fromText = trimmed.match(/\/listing\/(\d+)/i);
  return fromText?.[1] ?? "";
}

export function padsplitListingUrlFromInput(value: string | null | undefined): string | null {
  const id = extractPadsplitListingId(value);
  if (!id) return null;
  return `${PADSPLIT_LISTING_URL_BASE}/${id}`;
}
