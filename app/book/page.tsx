import type { Metadata } from "next";
import { BookingFlow } from "@/components/booking/BookingFlow";

export const metadata: Metadata = {
  title: "Book a Meeting with Caitlyn",
  description: "Chat with Caitlyn Verdugo — pick a time that works for you.",
};

export default function BookPage() {
  return <BookingFlow slug={null} />;
}
