"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MOBILE_NAV_ITEMS, type NavCounts } from "./nav-items";
import { MoreSheet } from "./MoreSheet";
import { countFor as countForCounts } from "@/lib/nav/countFor";
import { cn } from "@/lib/utils";

export function BottomNav({ counts = {}, userEmail }: { counts?: NavCounts; userEmail?: string | null }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const countFor = countForCounts(counts);

  return (
    <>
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur md:hidden">
        <ul className="flex items-stretch justify-around">
          {MOBILE_NAV_ITEMS.map((item) => {
            if (item.kind === "more") {
              return (
                <li key="more" className="flex-1">
                  <button
                    type="button"
                    onClick={() => setMoreOpen(true)}
                    className="flex h-full min-h-[66px] w-full flex-col items-center justify-center gap-[5px] py-3 text-[12.5px] font-medium text-neutral-400 active:bg-neutral-50"
                  >
                    <item.icon size={25} strokeWidth={2} />
                    {item.label}
                  </button>
                </li>
              );
            }

            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const count = countFor[item.href];

            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={cn(
                    "relative flex h-full min-h-[66px] flex-col items-center justify-center gap-[5px] py-3 text-[12.5px] font-medium active:bg-neutral-50",
                    active ? "text-brand-600 font-semibold" : "text-neutral-400",
                  )}
                >
                  <span className="relative">
                    <item.icon size={25} strokeWidth={active ? 2.4 : 2} />
                    {count && count.value > 0 && (
                      <span className="absolute -right-2.5 -top-2.5 flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-semibold text-white">
                        {count.value}
                      </span>
                    )}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} userEmail={userEmail} counts={counts} />
    </>
  );
}
