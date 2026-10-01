import type { Metadata } from "next";
import { PublicChrome } from "@/components/public/PublicChrome";

// Root layout links /manifest.json. Booking pages are also served on
// www.colivingcait.com, where that file 404s.
export const metadata: Metadata = {
  manifest: null,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Coliving Cait",
  },
};

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return <PublicChrome>{children}</PublicChrome>;
}
