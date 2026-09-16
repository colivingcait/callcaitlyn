"use client";

import { useEffect, useState } from "react";
import { useUnlocked } from "./UnlockContext";

// matchMedia, not a resize listener - sampling window.innerWidth once on
// mount and relying on `resize` to correct it leaves the bar stuck on at
// desktop width whenever the component mounts in a narrow/scaled frame.
// matchMedia re-evaluates independently of resize events.
export function MobileActionBar({ priceLabel, occupancyLabel }: { priceLabel: string; occupancyLabel: string }) {
  const { unlocked } = useUnlocked();
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 759px)");
    setNarrow(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setNarrow(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  if (!narrow) return null;

  return (
    <div
      data-om-noprint
      style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50, background: "#211c19", borderTop: "1px solid #3a322c", padding: "12px 16px", display: "flex", alignItems: "center", gap: 14 }}
    >
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 21, lineHeight: 1, color: "#f4f1ec" }}>{priceLabel}</p>
        <p style={{ margin: "5px 0 0", fontSize: 12, color: "#a39a8e", whiteSpace: "nowrap" }}>{occupancyLabel}</p>
      </div>
      <a
        href={unlocked ? "#offer" : "#unlock"}
        className="om-hover-fill-border"
        style={{ flex: "1 1 auto", textAlign: "center", whiteSpace: "nowrap", border: "1px solid #cc4a37", background: "#cc4a37", padding: "14px 16px", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", color: "#fff" }}
      >
        {unlocked ? "SUBMIT AN OFFER" : "UNLOCK FINANCIALS"}
      </a>
    </div>
  );
}
