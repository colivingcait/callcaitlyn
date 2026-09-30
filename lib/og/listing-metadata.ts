import { buildOgListingCard, type OgListingCard } from "@/lib/listings/og-card";
import { getPublicListing } from "@/lib/listings/public-data";

export const OG_SIZE = { width: 1200, height: 630 } as const;

export const OG_CONTENT_TYPE = "image/png";

type SlugParams = { slug: string };

export async function listingOgImageMetadata(params: Promise<SlugParams> | SlugParams): Promise<
  { id: string; alt: string; size: { width: number; height: number }; contentType: string }[]
> {
  const { slug } = await params;
  const listing = await getPublicListing(slug);
  if (!listing) return [];
  const card = buildOgListingCard(listing);
  return [
    {
      id: card.version,
      alt: card.title,
      size: { ...OG_SIZE },
      contentType: OG_CONTENT_TYPE,
    },
  ];
}

export async function listingOgCardForSlug(slug: string): Promise<OgListingCard | null> {
  const listing = await getPublicListing(slug);
  if (!listing) return null;
  return buildOgListingCard(listing);
}
