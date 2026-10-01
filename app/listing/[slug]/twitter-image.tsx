import { notFound } from "next/navigation";
import { listingOgCardForSlug, listingOgImageMetadata, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og/listing-metadata";
import { renderListingOgImage } from "@/lib/og/listing-og";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "Listing";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

type SlugParams = { slug: string };

export function generateImageMetadata({ params }: { params: Promise<SlugParams> | SlugParams }) {
  return listingOgImageMetadata(params);
}

export default async function Image({ params }: { params: Promise<SlugParams> | SlugParams }) {
  const { slug } = await params;
  const card = await listingOgCardForSlug(slug);
  if (!card) notFound();
  return renderListingOgImage(card);
}
