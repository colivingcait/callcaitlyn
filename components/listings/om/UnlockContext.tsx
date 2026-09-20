"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import {
  readOmUnlock,
  subscribeOmUnlock,
  writeOmUnlock,
  type OmUnlockPayload,
} from "@/lib/listings/om-unlock-storage";
import type { ListingFinancials } from "@/types/database";

// Shared between FinancialGate (writes the unlock payload) and
// MobileActionBar (reads unlocked to swap "UNLOCK FINANCIALS" for "SUBMIT AN
// OFFER"). State lives here — not in the gate leaf — because the listing
// server page remounts that leaf after the unlock server action refreshes.
const EMPTY = { unlocked: false as const, financials: null, workbookUrl: null };

type UnlockedContextValue = {
  unlocked: boolean;
  financials: ListingFinancials | null;
  workbookUrl: string | null;
  applyUnlock: (payload: OmUnlockPayload) => void;
};

const UnlockedContext = createContext<UnlockedContextValue | null>(null);

export function UnlockedProvider({ slug, children }: { slug: string; children: React.ReactNode }) {
  const payload = useSyncExternalStore(
    (onStoreChange) => subscribeOmUnlock(slug, onStoreChange),
    () => readOmUnlock(slug) ?? EMPTY,
    () => EMPTY,
  );

  const applyUnlock = useCallback((next: OmUnlockPayload) => {
    writeOmUnlock(slug, next);
  }, [slug]);

  const value = useMemo<UnlockedContextValue>(
    () => ({
      unlocked: payload.unlocked === true,
      financials: payload.financials,
      workbookUrl: payload.workbookUrl,
      applyUnlock,
    }),
    [payload, applyUnlock],
  );

  return <UnlockedContext.Provider value={value}>{children}</UnlockedContext.Provider>;
}

export function useUnlocked() {
  const ctx = useContext(UnlockedContext);
  if (!ctx) throw new Error("useUnlocked must be used within UnlockedProvider");
  return ctx;
}
