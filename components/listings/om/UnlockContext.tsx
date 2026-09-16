"use client";

import { createContext, useContext, useState } from "react";

// Shared between FinancialGate (sets it on a successful unlock) and
// MobileActionBar (reads it to swap "UNLOCK FINANCIALS" for "SUBMIT AN
// OFFER") - they're siblings under the server-rendered page, so a tiny
// context is simpler than lifting real financial data through props.
const UnlockedContext = createContext<{ unlocked: boolean; setUnlocked: (v: boolean) => void } | null>(null);

export function UnlockedProvider({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  return <UnlockedContext.Provider value={{ unlocked, setUnlocked }}>{children}</UnlockedContext.Provider>;
}

export function useUnlocked() {
  const ctx = useContext(UnlockedContext);
  if (!ctx) throw new Error("useUnlocked must be used within UnlockedProvider");
  return ctx;
}
