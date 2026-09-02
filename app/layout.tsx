import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  // Resolves relative/route-based metadata (og:image from the /book and
  // /book/[slug] opengraph-image.tsx files) to the real domain rather
  // than Next's localhost fallback - without this, a texted /book link's
  // preview card can resolve its image to the wrong host.
  metadataBase: new URL(process.env.APP_BASE_URL ?? "https://crm.callcaitlyn.com"),
  title: "CallCaitlyn CRM",
  description: "Real estate CRM for leads, follow-ups, and pipeline.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CallCaitlyn",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#cc4a37",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
