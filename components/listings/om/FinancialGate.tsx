"use client";

import { useState } from "react";
import { unlockListingFinancials } from "@/app/listing/[slug]/actions";
import { useUnlocked } from "./UnlockContext";
import { GATED_UNDERWRITING_FIELDS, gatedFinancialsHaveValues } from "@/lib/listings/gated-underwriting";
import { asListingFinancials, normalizeFinancials } from "@/lib/listings/crm-marketing-fields";
import { writeOmUnlock } from "@/lib/listings/om-unlock-storage";

// Purely illustrative rows for the locked/blurred teaser - NOT derived from
// this listing's real financials in any way. The locked page's HTML never
// contains the real figures.
const TEASER_ROWS = GATED_UNDERWRITING_FIELDS.map((field) => ({
  label: field.label,
  value: field.key === "dscr" || field.key === "cap_rate" || field.key === "cash_on_cash" ? "XX.X%" : "$XX,XXX",
}));

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

export function FinancialGate({ slug, omNumber }: { slug: string; omNumber: string }) {
  const { unlocked, financials, workbookUrl, applyUnlock } = useUnlocked();
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
    // Write storage first (module-level) so a remount during/after the
    // server-action refresh still sees the payload. applyUnlock notifies
    // the surviving provider in this tab.
    const next = {
      unlocked: true as const,
      financials: asListingFinancials(result.financials) ?? (result.financials ? normalizeFinancials(result.financials) : null),
      workbookUrl: result.workbookUrl ?? null,
    };
    writeOmUnlock(slug, next);
    applyUnlock(next);
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
                Purchase price, rents, fees, and the buyer workbook open on this page.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ borderTop: "1px solid #211c19", background: "#211c19", padding: "28px 30px" }}>
          <div style={{ display: "grid", gap: 26, gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", alignItems: "start" }}>
            <div style={{ maxWidth: "46ch" }}>
              <p style={{ margin: 0, fontFamily: "var(--font-om-serif)", fontSize: 22, color: "#f4f1ec" }}>Open the numbers</p>
              <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.65, color: "#cdc4ba" }}>
                Detail unlocks here instantly — no inbox trip. Vera&apos;s buyer workbook is also texted and emailed to you, so use real contact info if you
                want the source file.
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

  const hasGated = gatedFinancialsHaveValues(financials);

  if (!hasGated && !workbookUrl) {
    return (
      <div style={{ marginTop: 32 }}>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "#574f47", maxWidth: "62ch" }}>
          Unlocked — and Caitlyn has your info. Line-item underwriting isn&apos;t published on this listing yet, so the buyer workbook will come by text and
          email instead of on this page.
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid #a33a29", background: "#fdf3f2", padding: "13px 18px" }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: "#cc4a37" }} />
        <p style={{ margin: 0, fontSize: 13, color: "#8a2c1e" }}>Unlocked. Vera&apos;s buyer workbook is also on its way by text and email.</p>
      </div>

      {hasGated && financials && (
        <div style={{ marginTop: 22, borderTop: "1px solid #211c19" }}>
          {GATED_UNDERWRITING_FIELDS.filter((field) => Boolean(financials[field.key])).map((field, i, arr) => (
            <div
              key={field.key}
              style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "baseline", padding: "12px 0", borderBottom: i < arr.length - 1 ? "1px solid #e6e0d7" : undefined }}
            >
              <span style={{ fontSize: 14, color: "#2e2823" }}>{field.label}</span>
              <span style={{ fontWeight: 500, fontSize: 17, color: "#211c19" }}>{financials[field.key]}</span>
            </div>
          ))}
        </div>
      )}

      {workbookUrl && (
        <div
          style={{ marginTop: 40, border: "1px solid #211c19", background: "#211c19", padding: "24px 26px", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}
        >
          <div style={{ flex: "1 1 260px", minWidth: 0 }}>
            <p style={{ margin: 0, fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 21, color: "#f4f1ec" }}>Download the full workbook</p>
            <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.65, color: "#cdc4ba" }}>
              Vera&apos;s buyer workbook — the same file emailed and texted after unlock.
            </p>
          </div>
          <a
            href={workbookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="om-hover-fill-border"
            style={{ flex: "0 0 auto", border: "1px solid #cc4a37", background: "#cc4a37", padding: "15px 28px", fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", color: "#fff", textDecoration: "none" }}
          >
            DOWNLOAD WORKBOOK
          </a>
        </div>
      )}
      <p style={{ margin: "16px 0 0", fontSize: 12, letterSpacing: "0.08em", color: "#a39a8e" }}>{omNumber}</p>
    </div>
  );
}
