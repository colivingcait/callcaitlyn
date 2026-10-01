import type { Metadata, Viewport } from "next";
import { PublicChrome } from "@/components/public/PublicChrome";

// Root layout links /manifest.json. Booking pages are also served on
// www.colivingcait.com, where that file 404s.
export const metadata: Metadata = {
  manifest: null,
};

export const viewport: Viewport = {
  themeColor: "#FAF7F2",
};

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return <PublicChrome>{children}</PublicChrome>;
}
