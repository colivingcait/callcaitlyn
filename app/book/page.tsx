import type { Metadata } from "next";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { publicBookImageUrl, publicOgImage } from "@/lib/public-urls";

const bookImage = publicOgImage(publicBookImageUrl(), "Book time with Caitlyn Verdugo");

export const metadata: Metadata = {
  title: "Book a Meeting with Caitlyn",
  description: "Chat with Caitlyn Verdugo — pick a time that works for you.",
  openGraph: { images: [bookImage] },
  twitter: { card: "summary_large_image", images: [bookImage] },
};

export default async function BookPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = searchParams ? await searchParams : {};
  const fixture = typeof raw.fixture === "string" ? raw.fixture : null;
  return <BookingFlow slug={null} fixture={fixture} />;
}
