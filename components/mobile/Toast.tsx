"use client";

import type { ToastState } from "@/lib/hooks/useToast";
import { cn } from "@/lib/utils";

// Companion to optimistic UI - shows when an optimistic action's real
// server round-trip failed, since router.refresh() alone would just
// silently restore the truth with no explanation.
export function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  return (
    <div
      className="fixed inset-x-4 z-[60] flex justify-center md:hidden"
      style={{ bottom: "calc(90px + max(env(safe-area-inset-bottom), 10px))" }}
    >
      <div
        className={cn(
          "rounded-full px-4 py-2.5 text-[14px] font-medium text-white shadow-lg",
          toast.tone === "error" ? "bg-[#b91c1c]" : "bg-neutral-900",
        )}
      >
        {toast.message}
      </div>
    </div>
  );
}
