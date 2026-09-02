import type { Metadata } from "next";
import { BookingFlow } from "@/components/booking/BookingFlow";

export const metadata: Metadata = {
  title: "Chat with Caitlyn",
  description: "Pick a time that works for you.",
};

export default async function BookSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <BookingFlow slug={slug} />;
}
