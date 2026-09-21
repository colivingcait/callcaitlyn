"use client";

import { useEffect } from "react";

// Shared bottom sheet for seller analysis, booking, and (via CSS) the offer
// dialog. Fixed to the viewport — the artboard's sticky zero-height layer
// is a design-file trick, not the production position.
export function OmSheet({
  zIndex,
  eyebrow,
  title,
  subtitle,
  onClose,
  children,
}: {
  zIndex: number;
  eyebrow: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-om-noprint
      style={{
        position: "fixed",
        inset: 0,
        zIndex,
        background: "rgba(23,19,17,0.62)",
        display: "flex",
        alignItems: "flex-end",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={{ width: "100%", maxHeight: "100%", overflowY: "auto", background: "#f4f1ec", borderTop: "1px solid #211c19" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, background: "#211c19", padding: 18 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 500, letterSpacing: "0.18em", color: "#e9a396" }}>{eyebrow}</p>
            <p style={{ margin: "8px 0 0", fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 21, lineHeight: 1.2, color: "#f4f1ec" }}>{title}</p>
            {subtitle ? <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.6, color: "#cdc4ba" }}>{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="om-hover-fill"
            style={{ marginLeft: "auto", flex: "0 0 auto", width: 34, height: 34, border: "1px solid #453b34", background: "transparent", color: "#f4f1ec", fontSize: 15, cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function StepRule({ label, fraction }: { label: string; fraction: number }) {
  const full = fraction >= 1;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: "#a33a29", whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ flex: "1 1 auto", height: 3, background: full ? "#cc4a37" : "#e4ddd2", display: "flex" }}>
        {full ? null : <span style={{ width: `${Math.round(fraction * 100)}%`, background: "#cc4a37" }} />}
      </span>
    </div>
  );
}

export const boxedLabel: React.CSSProperties = { display: "block", fontSize: 13, color: "#574f47" };
export const boxedField: React.CSSProperties = {
  marginTop: 6,
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #d5cdc1",
  background: "#fffdfa",
  padding: "13px",
  fontSize: 15,
  color: "#211c19",
};
