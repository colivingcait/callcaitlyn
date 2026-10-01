// One public URL for Caitlyn's headshot. Next.js serves files in
// public/ as site-root paths, so this is public/images/checkin/caitlyn.jpg.
// Logged-in CRM chrome keeps this root-relative path.
export const CAITLYN_HEADSHOT_SRC = "/images/checkin/caitlyn.jpg";

// Listing and booking pages are also rendered on www.colivingcait.com.
// A root-relative public/ URL would be requested from that host.
export const CRM_PUBLIC_ORIGIN = "https://crm.callcaitlyn.com";

export function crmPublicAsset(src: string): string {
  if (/^https?:\/\//i.test(src)) return src;
  return `${CRM_PUBLIC_ORIGIN}${src.startsWith("/") ? src : `/${src}`}`;
}
