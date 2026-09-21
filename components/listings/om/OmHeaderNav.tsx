"use client";

import { useState } from "react";
import { useUnlocked } from "./UnlockContext";
import { usePublicSheets } from "./PublicSheets";

const LINKS = [
  { href: "#property", label: "PROPERTY" },
  { href: "#occupancy", label: "OCCUPANCY" },
  { href: "#financials", label: "FINANCIALS" },
  { href: "#process", label: "PROCESS" },
] as const;

export function OmHeaderNav() {
  const [open, setOpen] = useState(false);
  const { unlocked } = useUnlocked();
  const sheets = usePublicSheets();
  const ctaHref = unlocked ? "#offer" : "#unlock";
  const ctaLabel = unlocked ? "SUBMIT AN OFFER" : "UNLOCK FINANCIALS";

  return (
    <>
      <nav className="om-header-nav" style={{ marginLeft: "auto", minWidth: 0, overflow: "hidden", display: "flex", gap: 18, fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", color: "#b6aca2" }}>
        {LINKS.map((link) => (
          <a key={link.href} href={link.href} className="om-hover-light" style={{ color: "inherit", whiteSpace: "nowrap" }}>
            {link.label}
          </a>
        ))}
      </nav>
      <a
        href={ctaHref}
        className="om-hover-fill om-header-cta"
        style={{ flex: "0 0 auto", whiteSpace: "nowrap", border: "1px solid #cc4a37", background: "#cc4a37", padding: "9px 18px", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", color: "#fff" }}
      >
        {ctaLabel}
      </a>
      <button
        type="button"
        className="om-header-menu"
        aria-expanded={open}
        aria-controls="om-header-drawer"
        onClick={() => setOpen((v) => !v)}
        style={{
          marginLeft: "auto",
          flex: "0 0 auto",
          border: "1px solid #453b34",
          background: "transparent",
          padding: "8px 12px",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.1em",
          color: "#f4f1ec",
          cursor: "pointer",
        }}
      >
        {open ? "CLOSE" : "MENU"}
      </button>
      {open && (
        <div id="om-header-drawer" className="om-header-drawer" style={{ flex: "1 1 100%", padding: "4px 0 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="om-hover-light"
              style={{ display: "block", padding: "11px 0", fontSize: 13, fontWeight: 500, letterSpacing: "0.08em", color: "#b6aca2", textAlign: "left" }}
            >
              {link.label}
            </a>
          ))}
          {unlocked ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                sheets?.openOffer();
              }}
              className="om-hover-fill"
              style={{ marginTop: 8, display: "block", textAlign: "center", border: "1px solid #cc4a37", background: "#cc4a37", padding: "13px 16px", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", color: "#fff", whiteSpace: "nowrap", cursor: "pointer" }}
            >
              {ctaLabel}
            </button>
          ) : (
            <a
              href={ctaHref}
              onClick={() => setOpen(false)}
              className="om-hover-fill"
              style={{ marginTop: 8, display: "block", textAlign: "center", border: "1px solid #cc4a37", background: "#cc4a37", padding: "13px 16px", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", color: "#fff", whiteSpace: "nowrap" }}
            >
              {ctaLabel}
            </a>
          )}
        </div>
      )}
    </>
  );
}
