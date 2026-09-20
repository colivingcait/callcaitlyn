"use client";

import { useState } from "react";
import { unlockListingFinancials } from "@/app/listing/[slug]/actions";
import { useUnlocked } from "./UnlockContext";
import {
  GATED_RATIO_FIELDS,
  GATED_UNDERWRITING_FIELDS,
  formatMonthlyAverage,
  gatedFinancialsHaveValues,
} from "@/lib/listings/gated-underwriting";
import { asListingFinancials, normalizeFinancials, visibleImprovements } from "@/lib/listings/crm-marketing-fields";
import { writeOmUnlock } from "@/lib/listings/om-unlock-storage";
import { formatCurrency } from "@/lib/utils";
import type { ListingImprovement } from "@/types/database";

// Purely illustrative rows for the locked/blurred teaser - NOT derived from
// this listing's real financials in any way. The locked page's HTML never
// contains the real figures.
const TEASER_ROWS = GATED_UNDERWRITING_FIELDS.map((field) => ({
  label: field.label,
  value: "$X,XXX",
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

function scrollToFinancials() {
  const el = document.getElementById("financials");
  if (!el) return;
  window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - 80 });
}

function formatImprovementCost(cost: string): string {
  const trimmed = cost.trim();
  if (!trimmed) return "—";
  if (/[A-Za-z/]/.test(trimmed)) return trimmed;
  const n = Number(trimmed.replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(n) || trimmed.replace(/[^0-9.-]/g, "") === "") return trimmed;
  if (trimmed.includes("$")) return trimmed;
  return formatCurrency(n);
}

function CapExCard({ rows }: { rows: ListingImprovement[] }) {
  if (rows.length === 0) return null;
  return (
    <div style={{ marginTop: 40 }}>
      <h3 style={{ margin: 0, fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 24, color: "#211c19" }}>Recent capital improvements</h3>
      <div style={{ marginTop: 14, background: "#fffdfa", border: "1px solid #e4ddd2" }}>
        <div
          className="om-capex-row"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) 88px 120px",
            gap: 18,
            padding: "12px 20px",
            borderBottom: "1px solid #ece5da",
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.14em", color: "#6b6259" }}>ITEM</span>
          <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.14em", color: "#6b6259" }}>YEAR</span>
          <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.14em", color: "#6b6259", textAlign: "right" }}>COST</span>
        </div>
        {rows.map((row, i) => (
          <div
            key={`${row.item}-${row.year}-${i}`}
            className="om-capex-row"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) 88px 120px",
              gap: 18,
              alignItems: "baseline",
              padding: "15px 20px",
              borderBottom: i < rows.length - 1 ? "1px solid #ece5da" : undefined,
            }}
          >
            <span style={{ fontSize: 15, lineHeight: 1.4, color: "#211c19" }}>{row.item || "—"}</span>
            <span style={{ fontSize: 15, color: "#574f47" }}>{row.year || "—"}</span>
            <span
              style={{
                fontFamily: "var(--font-om-serif)",
                fontWeight: 600,
                fontSize: 22,
                lineHeight: 1,
                color: "#211c19",
                textAlign: "right",
                whiteSpace: "nowrap",
              }}
            >
              {formatImprovementCost(row.cost)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FinancialGate({
  slug,
  omNumber,
  improvements,
}: {
  slug: string;
  omNumber: string;
  improvements?: ListingImprovement[] | null;
}) {
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
    requestAnimationFrame(scrollToFinancials);
  }

  if (!unlocked) {
    return (
      <div>
        <div style={{ marginTop: 26, border: "1px solid #211c19", background: "#fffdfa" }}>
          <div style={{ position: "relative" }}>
            <div style={{ filter: "blur(5px)", opacity: 0.5, userSelect: "none", pointerEvents: "none", padding: "26px 30px" }}>
              {TEASER_ROWS.map((row, i) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "11px 0",
                    borderBottom: i < TEASER_ROWS.length - 1 ? "1px solid #e6e0d7" : undefined,
                  }}
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
                  Monthly rents, expenses, debt service, CapEx, and the buyer workbook open on this page.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ borderTop: "1px solid #211c19", background: "#211c19", padding: "28px 30px" }}>
            <div style={{ display: "grid", gap: 26, gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", alignItems: "start" }}>
              <div style={{ maxWidth: "46ch" }}>
                <p style={{ margin: 0, fontFamily: "var(--font-om-serif)", fontSize: 22, color: "#f4f1ec" }}>Open the numbers</p>
                <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.65, color: "#cdc4ba" }}>
                  Detail unlocks right here — no inbox trip, no waiting on a reply. Figures are monthly averages across the trailing twelve months; the
                  workbook has it month by month.
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
                    whiteSpace: "nowrap",
                  }}
                >
                  {submitting ? "UNLOCKING…" : "UNLOCK THE DETAIL"}
                </button>
              </div>
            </div>
          </form>
        </div>
        <p style={{ margin: "14px 0 0", fontSize: 13, lineHeight: 1.6, color: "#574f47" }}>
          Unlock reveals rents, expenses, debt service, CapEx, and the workbook.
        </p>
      </div>
    );
  }

  const hasGated = gatedFinancialsHaveValues(financials);
  const ratioCards = GATED_RATIO_FIELDS.filter((field) => Boolean(financials?.[field.key]));
  const monthlyRows = GATED_UNDERWRITING_FIELDS.filter((field) => Boolean(financials?.[field.key]));
  const capexRows = visibleImprovements(improvements);

  if (!hasGated && !workbookUrl && capexRows.length === 0) {
    return (
      <div style={{ marginTop: 32 }} aria-live="polite">
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "#574f47", maxWidth: "62ch" }}>
          Unlocked — and Caitlyn has your info. Line-item underwriting isn&apos;t published on this listing yet.
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 32 }} aria-live="polite">
      <div style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid #a33a29", background: "#fdf3f2", padding: "13px 18px" }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: "#cc4a37" }} />
        <p style={{ margin: 0, fontSize: 13, color: "#8a2c1e" }}>Unlocked. The line items and the buyer workbook are below.</p>
      </div>

      {ratioCards.length > 0 && financials && (
        <div className="om-fin-ratios" style={{ marginTop: 26, display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 14 }}>
          {ratioCards.map((field) => (
            <div key={field.key} style={{ background: "#fffdfa", border: "1px solid #e4ddd2", borderTop: "2px solid #cc4a37", padding: "18px 18px 20px" }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "0.14em", color: "#6b6259" }}>{field.omLabel}</p>
              <p style={{ margin: "12px 0 0", fontFamily: "var(--font-om-serif)", fontSize: 34, lineHeight: 1, color: "#211c19" }}>{financials[field.key]}</p>
            </div>
          ))}
        </div>
      )}

      {monthlyRows.length > 0 && financials && (
        <>
          <p style={{ margin: "26px 0 0", fontSize: 12, fontWeight: 500, letterSpacing: "0.16em", color: "#6b6259" }}>MONTHLY AVERAGE · TRAILING TWELVE MONTHS</p>
          <div style={{ marginTop: 14, background: "#fffdfa", border: "1px solid #e4ddd2" }}>
            {monthlyRows.map((field, i) => (
              <div
                key={field.key}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 20,
                  padding: "15px 20px",
                  borderBottom: i < monthlyRows.length - 1 ? "1px solid #ece5da" : undefined,
                }}
              >
                <span style={{ fontSize: 15, lineHeight: 1.4, color: "#574f47" }}>{field.label}</span>
                <span style={{ fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 22, lineHeight: 1, color: "#211c19", whiteSpace: "nowrap" }}>
                  {formatMonthlyAverage(financials[field.key], { signed: field.key === "net_cash_flow" })}
                </span>
              </div>
            ))}
          </div>
          <p style={{ margin: "14px 0 0", fontSize: 13, lineHeight: 1.65, color: "#574f47", maxWidth: "62ch" }}>
            Every figure above is a monthly average across the trailing twelve months. Month-by-month detail is in the buyer workbook.
          </p>
        </>
      )}

      <CapExCard rows={capexRows} />

      {workbookUrl && (
        <div
          style={{ marginTop: 40, border: "1px solid #211c19", background: "#211c19", padding: "24px 26px", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}
        >
          <div style={{ flex: "1 1 260px", minWidth: 0 }}>
            <p style={{ margin: 0, fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 21, color: "#f4f1ec" }}>Download the full workbook</p>
            <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.65, color: "#cdc4ba" }}>
              Rent roll, T12, and the scenario tabs behind these numbers.
            </p>
          </div>
          <a
            href={workbookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="om-hover-fill-border"
            style={{
              flex: "0 0 auto",
              border: "1px solid #cc4a37",
              background: "#cc4a37",
              padding: "15px 28px",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.12em",
              color: "#fff",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            DOWNLOAD WORKBOOK
          </a>
        </div>
      )}
      <p style={{ margin: "16px 0 0", fontSize: 12, letterSpacing: "0.08em", color: "#a39a8e" }}>{omNumber}</p>
    </div>
  );
}
