import type { MetadataRoute } from "next";
import { getPublicListings } from "@/lib/listings/public-data";
import { PUBLIC_LISTINGS_URL, publicListingUrl } from "@/lib/public-urls";

// Served at /listing/sitemap.xml. www.colivingcait.com rewrites
// /listings/sitemap.xml to /public-listings/sitemap.xml, which this app
// rewrites to this route. Entries are the canonical www URLs.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const listings = await getPublicListings();
  const seen = new Set<string>();
  const entries: MetadataRoute.Sitemap = [
    { url: PUBLIC_LISTINGS_URL, changeFrequency: "weekly", priority: 0.8 },
    { url: `${PUBLIC_LISTINGS_URL}/map`, changeFrequency: "weekly", priority: 0.7 },
  ];
  for (const listing of listings) {
    const slug = listing.public_slug;
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    entries.push({ url: publicListingUrl(slug), changeFrequency: "weekly", priority: 0.6 });
  }
  return entries;
}
