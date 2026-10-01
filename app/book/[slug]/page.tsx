import type { Metadata } from "next";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { publicBookImageUrl, publicOgImage } from "@/lib/public-urls";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const image = publicOgImage(publicBookImageUrl(slug), "Book time with Caitlyn Verdugo");
  return {
    title: "Chat with Caitlyn",
    description: "Pick a time that works for you.",
    openGraph: { images: [image] },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

export default async function BookSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <BookingFlow slug={slug} />;
}
