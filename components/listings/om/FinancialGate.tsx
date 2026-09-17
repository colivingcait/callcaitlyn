"use client";

import { useState } from "react";
import { unlockListingFinancials } from "@/app/listing/[slug]/actions";
import { useUnlocked } from "./UnlockContext";
import type { ListingFinancials, ListingImprovement } from "@/types/database";

// Purely illustrative rows for the locked/blurred teaser - NOT derived from
// this listing's real financials in any way. The point of rendering these
// server-side (this file is a client component, but it receives no real
// numbers as props at all) is that the locked page's HTML can never leak
// the real figures no matter how the blur/scrim CSS is inspected - the
// prototype blurred real values with CSS alone, which is readable in
// devtools; this avoids the problem by never having real values to blur.
const TEASER_ROWS = [
  { label: "Gross scheduled rent", value: "$XX,XXX" },
  { label: "Vacancy & turnover loss", value: "−$X,XXX" },
  { label: "Total operating expenses", value: "$XX,XXX" },
  { label: "Net operating income", value: "$XX,XXX" },
  { label: "Cap rate at asking", value: "XX.X%" },
];

const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 500, letterSpacing: "0.14em", color: "#a39a8e" };
const inputStyle: React.CSSProperties = {
  marginTop: 8,
  width: "100%",
  boxSizing: "border-box",
  border: 0,
  borderBottom: "1px solid #453b34",
  background: "transparent",
  padding: "9px 0",
  fontSize: 15,
  color: "#f4f1ec",
};

export function FinancialGate({
  slug,
  omNumber,
  showCapex,
  improvements,
}: {
  slug: string;
  omNumber: string;
  showCapex: boolean;
  improvements: ListingImprovement[] | null;
}) {
  const { unlocked, setUnlocked } = useUnlocked();
  const [financials, setFinancials] = useState<ListingFinancials | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const result = await unlockListingFinancials(slug, {
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      email: String(form.get("email") ?? ""),
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setFinancials(result.financials ?? null);
    setUnlocked(true);
  }

  if (!unlocked) {
    return (
      <div style={{ marginTop: 26, border: "1px solid #211c19", background: "#fffdfa" }}>
        <div style={{ position: "relative" }}>
          <div style={{ filter: "blur(5px)", opacity: 0.5, userSelect: "none", pointerEvents: "none", padding: "26px 30px" }}>
            {TEASER_ROWS.map((row, i) => (
              <div
                key={row.label}
                style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: i < TEASER_ROWS.length - 1 ? "1px solid #e6e0d7" : undefined }}
              >
                <span style={{ fontSize: 14 }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{row.value}</span>
              </div>
            ))}
          </div>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              background: "linear-gradient(to bottom, rgba(255,253,250,0.6), rgba(255,253,250,0.96))",
            }}
          >
            <div style={{ textAlign: "center", maxWidth: "42ch" }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "0.2em", color: "#a33a29" }}>LINE-ITEM DETAIL LOCKED</p>
              <p style={{ margin: "12px 0 0", fontFamily: "var(--font-om-serif)", fontSize: 23, lineHeight: 1.3, color: "#211c19" }}>
                Every expense line, the underwriting tools, capital improvements, and three financing scenarios open on this page.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ borderTop: "1px solid #211c19", background: "#211c19", padding: "28px 30px" }}>
          <div style={{ display: "grid", gap: 26, gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", alignItems: "start" }}>
            <div style={{ maxWidth: "46ch" }}>
              <p style={{ margin: 0, fontFamily: "var(--font-om-serif)", fontSize: 22, color: "#f4f1ec" }}>Open the numbers</p>
              <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.65, color: "#cdc4ba" }}>
                Detail unlocks here instantly — no inbox trip. The T12 and PadSplit earnings statement are also texted and emailed to you, so use real
                contact info if you want the source documents.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 380 }}>
              <div>
                <label htmlFor="u-name" style={labelStyle}>NAME</label>
                <input id="u-name" name="name" required className="om-input" style={inputStyle} />
              </div>
              <div>
                <label htmlFor="u-phone" style={labelStyle}>PHONE</label>
                <input id="u-phone" name="phone" type="tel" className="om-input" style={inputStyle} />
              </div>
              <div>
                <label htmlFor="u-email" style={labelStyle}>EMAIL</label>
                <input id="u-email" name="email" type="email" className="om-input" style={inputStyle} />
              </div>
              {error && <p style={{ margin: 0, fontSize: 13, color: "#e26e5d" }}>{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="om-hover-fill-border"
                style={{
                  alignSelf: "flex-start",
                  marginTop: 4,
                  border: "1px solid #cc4a37",
                  background: "#cc4a37",
                  padding: "13px 26px",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                {submitting ? "UNLOCKING…" : "UNLOCK THE DETAIL"}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  if (!financials) {
    return (
      <div style={{ marginTop: 32 }}>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "#574f47", maxWidth: "62ch" }}>
          Unlocked — and Caitlyn has your info. Line-item underwriting isn&apos;t published on this listing yet, so the T12 and earnings statement will come by
          text and email instead of on this page.
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid #a33a29", background: "#fdf3f2", padding: "13px 18px" }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: "#cc4a37" }} />
        <p style={{ margin: 0, fontSize: 13, color: "#8a2c1e" }}>Unlocked. The T12 and PadSplit earnings statement are also on their way by text and email.</p>
      </div>

      <div style={{ marginTop: 22, borderTop: "1px solid #211c19" }}>
        {financials.t12.map((line, i) => (
          <div
            key={line.label + i}
            style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "baseline", padding: "12px 0", borderBottom: "1px solid #e6e0d7" }}
          >
            <span style={{ fontSize: 14, color: line.subtotal ? "#211c19" : "#2e2823", fontWeight: line.subtotal ? 600 : 400 }}>{line.label}</span>
            <span style={{ fontWeight: 500, fontSize: 17, color: line.subtotal ? "#211c19" : "#2e2823" }}>{line.value}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "baseline", padding: "20px 0 0" }}>
          <div>
            <p style={{ margin: 0, fontFamily: "var(--font-om-serif)", fontSize: 24, color: "#211c19" }}>Net operating income</p>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "#a33a29" }}>{financials.cap_rate} cap rate at asking</p>
          </div>
          <span style={{ fontFamily: "var(--font-om-serif)", fontSize: 40, lineHeight: 1, color: "#211c19" }}>{financials.noi}</span>
        </div>
      </div>

      {financials.scenarios.length > 0 && (
        <>
          <h3 style={{ margin: "44px 0 0", fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 24, color: "#211c19" }}>Financing scenarios</h3>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: "#574f47" }}>Against in-place NOI of {financials.noi}.</p>
          <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
            {financials.scenarios.map((s) => (
              <div key={s.label} style={{ padding: "22px 22px 24px", border: "1px solid #ddd6cc", margin: "0 -1px -1px 0", background: "#fffdfa" }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "0.14em", color: "#6b6259" }}>{s.label}</p>
                <p style={{ margin: "16px 0 0", fontFamily: "var(--font-om-serif)", fontSize: 36, lineHeight: 1, color: "#211c19" }}>{s.coc}</p>
                <p style={{ margin: "7px 0 0", fontSize: 13, color: "#574f47" }}>cash-on-cash</p>
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #e6e0d7", display: "flex", flexDirection: "column", gap: 7, fontSize: 13, color: "#2e2823" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Cash in</span>
                    <span>{s.cash_in}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Debt service</span>
                    <span>{s.debt_service}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Cash flow</span>
                    <span>{s.cash_flow}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div
        data-om-noprint
        style={{ marginTop: 40, border: "1px solid #211c19", background: "#211c19", padding: "24px 26px", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}
      >
        <div style={{ flex: "1 1 260px", minWidth: 0 }}>
          <p style={{ margin: 0, fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 21, color: "#f4f1ec" }}>Take the whole memorandum with you</p>
          <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.65, color: "#cdc4ba" }}>
            Full underwriting, occupancy history, and capital improvements — with Caitlyn&apos;s contact details on every page, so it travels well to your
            partner or lender.
          </p>
        </div>
        <button
          type="button"
          // Short-term: the browser's print dialog against the print
          // stylesheet below (letterhead in, noprint chrome out) - explicitly
          // sanctioned as an interim approach pending a real server-rendered,
          // watermarked PDF route. Only reachable from here, i.e. only after
          // a real unlock, so what gets "printed" always includes the
          // unlocked detail - never the locked teaser.
          onClick={() => window.print()}
          className="om-hover-fill-border"
          style={{ flex: "0 0 auto", border: "1px solid #cc4a37", background: "#cc4a37", padding: "15px 28px", fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", color: "#fff", cursor: "pointer" }}
        >
          DOWNLOAD PDF
        </button>
      </div>

      {showCapex && improvements && improvements.length > 0 && (
        <>
          <h3 style={{ margin: "44px 0 0", fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 24, color: "#211c19" }}>Capital improvements</h3>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: "#574f47" }}>Receipts included in the packet.</p>
          <div style={{ marginTop: 18, borderTop: "1px solid #211c19" }}>
            {improvements.map((item, i) => (
              <div
                key={item.item + i}
                style={{ display: "grid", gridTemplateColumns: "1fr auto 110px", gap: 18, alignItems: "baseline", padding: "14px 0", borderBottom: "1px solid #e6e0d7" }}
                className="om-capex-row"
              >
                <span style={{ fontSize: 15, color: "#211c19" }}>{item.item}</span>
                <span style={{ fontSize: 13, letterSpacing: "0.06em", color: "#6b6259" }}>{item.year}</span>
                <span style={{ fontWeight: 500, fontSize: 17, color: "#211c19", textAlign: "right" }}>{item.cost}</span>
              </div>
            ))}
          </div>
        </>
      )}
      <p style={{ margin: "16px 0 0", fontSize: 12, letterSpacing: "0.08em", color: "#a39a8e" }}>{omNumber}</p>
    </div>
  );
}
