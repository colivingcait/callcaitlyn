// Canonical public marketing URLs. www.colivingcait.com proxies
// /listings and /book to this app; the CRM host (crm.callcaitlyn.com)
// should not be the URL we put in shares, email, or metadata.
// Relative /listings is only safe on the public site. On the CRM host,
// /listings is the logged-in reverse-prospecting section.

export const PUBLIC_SITE_URL = (process.env.NEXT_PUBLIC_PUBLIC_SITE_URL ?? "https://www.colivingcait.com").replace(/\/$/, "");

export const PUBLIC_LISTINGS_URL = `${PUBLIC_SITE_URL}/listings`;

export function publicListingUrl(slug: string): string {
  return `${PUBLIC_LISTINGS_URL}/${encodeURIComponent(slug)}`;
}

export function publicBookUrl(path?: string): string {
  const base = `${PUBLIC_SITE_URL}/book`;
  if (!path) return base;
  const cleaned = path.replace(/^\/+/, "").replace(/\/+$/, "");
  return cleaned ? `${base}/${cleaned}` : base;
}

// Site-relative path on www.colivingcait.com. Hash and already-absolute
// URLs are left alone (footer social placeholders and Instagram).
export function publicSiteUrl(path = "/"): string {
  if (path === "#" || /^https?:\/\//i.test(path) || path.startsWith("mailto:")) return path;
  return `${PUBLIC_SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
