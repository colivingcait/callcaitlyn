import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Listing",
  description: "This listing isn't available anymore.",
  openGraph: { images: [] },
  twitter: { card: "summary", images: [] },
};

export default function ListingNotFound() {
  return (
    <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f1ec", padding: 16, textAlign: "center" }}>
      <p style={{ color: "#574f47" }}>This listing isn&apos;t available anymore.</p>
    </main>
  );
}
