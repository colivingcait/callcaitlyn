"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { SquarePen } from "lucide-react";
import { LogSheet } from "@/components/contacts/mobile/LogSheet";

// Replaces the generic "+" FAB on Today only - a labeled Log pill, since
// logging a follow-up is the one thing worth a dedicated always-visible
// button. Every other screen's FAB slot goes quiet on mobile (New contact
// moves to People's header button in Phase 3, New task moves into the
// More sheet).
export function LogPill({ ownerId }: { ownerId: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  if (pathname !== "/") return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Log activity"
        className="fixed bottom-[104px] right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-brand-600 px-[22px] text-[15px] font-semibold text-white shadow-[0_10px_22px_rgba(172,56,38,0.32)] active:scale-95 md:hidden"
      >
        <SquarePen size={19} /> Log
      </button>
      <LogSheet open={open} onClose={() => setOpen(false)} ownerId={ownerId} />
    </>
  );
}
