"use client";

import { useState } from "react";

// One-pager share row. LINK copies the public listing URL.
// Open question (not built): a tracked share link so a forward shows up in
// listing activity. PDF templates themselves are the next design session.
export function ShareRow({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const url = `${window.location.origin}/listing/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div data-om-noprint style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid #ddd6cc", display: "flex", alignItems: "center", gap: 12 }}>
      <p style={{ margin: 0, flex: "1 1 auto", fontSize: 13, lineHeight: 1.5, color: "#574f47" }}>Share this offering — one page, no line items</p>
      <a href={`/listing/${slug}/one-pager`} className="om-hover-accent" style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", color: "#a33a29" }}>
        PDF
      </a>
      <span style={{ color: "#ddd6cc" }}>·</span>
      <button
        type="button"
        className="om-hover-accent"
        onClick={copyLink}
        style={{ border: 0, background: "transparent", padding: 0, fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", color: "#a33a29", cursor: "pointer" }}
      >
        {copied ? "COPIED" : "LINK"}
      </button>
    </div>
  );
}
