"use client";

import Link from "next/link";
import { useState } from "react";

export function ListingsIndexHeader({
  listingsHref = "/listing#listings",
  soldHref = "/listing#sold",
}: {
  listingsHref?: string;
  soldHref?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header data-om-noprint style={{ position: "sticky", top: 0, zIndex: 30, background: "#211c19", borderBottom: "1px solid #332b26" }}>
      <div
        className="om-header-inner"
        style={{ margin: "0 auto", maxWidth: 1180, padding: "12px 28px", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap", minHeight: 62 }}
      >
        <Link
          href="/listing"
          className="om-header-brand"
          style={{ margin: 0, fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 21, color: "#f4f1ec", whiteSpace: "nowrap" }}
        >
          CallCaitlyn
        </Link>
        <span className="om-header-rule" style={{ width: 1, height: 22, background: "#453b34" }} />
        <p className="om-header-meta" style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "0.18em", color: "#a39a8e", whiteSpace: "nowrap" }}>
          LISTINGS
        </p>
        <nav
          className="om-header-nav"
          style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 22, fontSize: 12, fontWeight: 500, letterSpacing: "0.14em", color: "#a39a8e" }}
        >
          <a href={listingsHref} className="om-hover-light" style={{ color: "#a39a8e" }}>
            LISTINGS
          </a>
          <a href={soldHref} className="om-hover-light" style={{ color: "#a39a8e" }}>
            SOLD
          </a>
          <Link
            href="/book"
            className="om-hover-fill-border om-header-cta"
            style={{ border: "1px solid #574f47", color: "#f4f1ec", padding: "9px 16px", letterSpacing: "0.14em", whiteSpace: "nowrap" }}
          >
            BOOK A CALL
          </Link>
        </nav>
        <button
          type="button"
          className="om-header-menu"
          aria-expanded={open}
          aria-controls="listings-header-drawer"
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
          <div id="listings-header-drawer" className="om-header-drawer" style={{ flex: "1 1 100%", padding: "4px 0 8px", display: "flex", flexDirection: "column", gap: 4 }}>
            <a
              href={listingsHref}
              onClick={() => setOpen(false)}
              className="om-hover-light"
              style={{ display: "block", padding: "10px 0", fontSize: 13, fontWeight: 500, letterSpacing: "0.08em", color: "#b6aca2" }}
            >
              LISTINGS
            </a>
            <a
              href={soldHref}
              onClick={() => setOpen(false)}
              className="om-hover-light"
              style={{ display: "block", padding: "10px 0", fontSize: 13, fontWeight: 500, letterSpacing: "0.08em", color: "#b6aca2" }}
            >
              SOLD
            </a>
            <Link
              href="/book"
              onClick={() => setOpen(false)}
              className="om-hover-fill-border"
              style={{
                marginTop: 8,
                display: "block",
                textAlign: "center",
                border: "1px solid #574f47",
                padding: "12px 16px",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.1em",
                color: "#f4f1ec",
                whiteSpace: "nowrap",
              }}
            >
              BOOK A CALL
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
