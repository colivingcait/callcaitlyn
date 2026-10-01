import type { Metadata, Viewport } from "next";
import "leaflet/dist/leaflet.css";
import "./om.css";
import { PublicChrome } from "@/components/public/PublicChrome";

// Root layout links /manifest.json. These pages are also served on
// www.colivingcait.com, where that file 404s.
export const metadata: Metadata = {
  manifest: null,
};

export const viewport: Viewport = {
  themeColor: "#FAF7F2",
};

// Cormorant Garamond + DM Sans come from PublicChrome (same families as the
// marketing site). --font-om-serif / --font-om-sans alias those variables.
export default function ListingLayout({ children }: { children: React.ReactNode }) {
  return <PublicChrome>{children}</PublicChrome>;
}
