"use client";

import { useEffect, useState } from "react";
import { displayGatedMonthlyAverage } from "@/lib/listings/gated-underwriting";
import { useUnlocked } from "./UnlockContext";
import { usePublicSheets } from "./PublicSheets";

// matchMedia, not a resize listener - sampling window.innerWidth once on
// mount and relying on `resize` to correct it leaves the bar stuck on at
// desktop width whenever the component mounts in a narrow/scaled frame.
// matchMedia re-evaluates independently of resize events.
export function MobileActionBar({ priceLabel, occupancyLabel }: { priceLabel: string; occupancyLabel: string }) {
  const { unlocked, financials } = useUnlocked();
  const sheets = usePublicSheets();
  const [narrow, setNarrow] = useState(false);
  const net = financials?.net_cash_flow ? displayGatedMonthlyAverage(financials, "net_cash_flow") : null;
  const subline = unlocked && net ? `Unlocked · ${net}/mo net` : occupancyLabel;

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
      style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50, background: "#211c19", borderTop: "1px solid #3a322c", padding: "10px 16px", display: "flex", alignItems: "center", gap: 12 }}
    >
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontFamily: "var(--font-om-serif)", fontWeight: 600, fontSize: 19, lineHeight: 1, color: "#f4f1ec" }}>{priceLabel}</p>
        <p style={{ margin: "4px 0 0", fontSize: 11, color: unlocked && net ? "#e9a396" : "#a39a8e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subline}</p>
      </div>
      {unlocked ? (
        <button
          type="button"
          onClick={() => sheets?.openOffer()}
          className="om-hover-fill-border"
          style={{ flex: "1 1 auto", textAlign: "center", whiteSpace: "nowrap", border: "1px solid #cc4a37", background: "#cc4a37", padding: "14px 12px", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", color: "#fff", cursor: "pointer" }}
        >
          SUBMIT AN OFFER
        </button>
      ) : (
        <a
          href="#unlock"
          className="om-hover-fill-border"
          style={{ flex: "1 1 auto", textAlign: "center", whiteSpace: "nowrap", border: "1px solid #cc4a37", background: "#cc4a37", padding: "14px 12px", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", color: "#fff" }}
        >
          UNLOCK FINANCIALS
        </a>
      )}
    </div>
  );
}
