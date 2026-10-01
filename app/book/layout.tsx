import type { Metadata } from "next";

// Root layout links /manifest.json. Booking pages are also served on
// www.colivingcait.com, where that file 404s.
export const metadata: Metadata = {
  manifest: null,
};

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return children;
}
