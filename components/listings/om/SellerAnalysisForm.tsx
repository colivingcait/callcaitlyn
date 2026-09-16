"use client";

import { useState } from "react";
import { requestSellerAnalysis } from "@/app/listing/[slug]/actions";

const label: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 500, letterSpacing: "0.14em", color: "#a39a8e" };
const input: React.CSSProperties = { marginTop: 8, width: "100%", boxSizing: "border-box", border: 0, borderBottom: "1px solid #453b34", background: "transparent", padding: "9px 0", fontSize: 15, color: "#f4f1ec" };

// "What would your PadSplit sell for?" - the other half of the page's
// purpose, independent of any one listing (a seller doesn't own this one).
export function SellerAnalysisForm() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const result = await requestSellerAnalysis({
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      email: String(form.get("email") ?? ""),
      city: String(form.get("city") ?? ""),
      notes: String(form.get("notes") ?? ""),
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSent(true);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <label htmlFor="s-name" style={label}>NAME</label>
        <input id="s-name" name="name" required className="om-input" style={input} />
      </div>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 130px" }}>
          <label htmlFor="s-phone" style={label}>PHONE</label>
          <input id="s-phone" name="phone" type="tel" className="om-input" style={input} />
        </div>
        <div style={{ flex: "1 1 130px" }}>
          <label htmlFor="s-email" style={label}>EMAIL</label>
          <input id="s-email" name="email" type="email" className="om-input" style={input} />
        </div>
      </div>
      <div>
        <label htmlFor="s-city" style={label}>CITY / SUBMARKET</label>
        <input id="s-city" name="city" className="om-input" style={input} />
      </div>
      <div>
        <label htmlFor="s-notes" style={label}>ANYTHING ELSE</label>
        <textarea id="s-notes" name="notes" rows={2} placeholder="Room count, occupancy, timeline" className="om-input" style={{ ...input, resize: "vertical" }} />
      </div>
      {error && <p style={{ margin: 0, fontSize: 13, color: "#e26e5d" }}>{error}</p>}
      <button
        type="submit"
        disabled={submitting || sent}
        className="om-hover-fill-border"
        style={{ alignSelf: "flex-start", border: "1px solid #cc4a37", background: "#cc4a37", padding: "13px 26px", fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", color: "#fff", cursor: "pointer" }}
      >
        {sent ? "SENT — I'LL BE IN TOUCH" : submitting ? "SENDING…" : "GET MY ANALYSIS"}
      </button>
    </form>
  );
}
