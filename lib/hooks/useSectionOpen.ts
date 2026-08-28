"use client";

import { useEffect, useState } from "react";

// Persists a collapsible section's open/closed state across navigation -
// single-owner app, so this is keyed purely by section name rather than
// per-user (no session lookup needed client-side just for this). SSR-safe
// lazy-init read, matching the one existing localStorage precedent in
// TextBlastModal.tsx (no wrapper library, just plain getItem/setItem).
export function useSectionOpen(key: string, defaultOpen: boolean): [boolean, (next: boolean) => void] {
  const storageKey = `section:${key}`;
  const [open, setOpenState] = useState(defaultOpen);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
    if (stored !== null) setOpenState(stored === "1");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  function setOpen(next: boolean) {
    setOpenState(next);
    if (typeof window !== "undefined") window.localStorage.setItem(storageKey, next ? "1" : "0");
  }

  return [open, setOpen];
}
