"use client";

import { useCallback, useState } from "react";

export type ToastState = { id: number; message: string; tone: "default" | "error" } | null;

// Minimal toast, added as optimistic UI's required companion - rollback
// needs some way to say "that didn't send" rather than silently reverting
// with no explanation. One toast at a time; a new one replaces whatever's
// showing.
export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);

  const showToast = useCallback((message: string, tone: "default" | "error" = "default") => {
    const id = Date.now();
    setToast({ id, message, tone });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3200);
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  return { toast, showToast, dismissToast };
}
