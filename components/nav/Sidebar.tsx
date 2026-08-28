"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { useState } from "react";
import { NAV_GROUPS } from "./nav-items";
import { SignOutButton } from "./SignOutButton";
import { QuickAddMenu } from "./QuickAddMenu";
import { cn } from "@/lib/utils";

export type NavCounts = { contacts?: number; dialer?: number; messages?: number };

export function Sidebar({ userEmail, counts = {} }: { userEmail?: string | null; counts?: NavCounts }) {
  const pathname = usePathname();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const countFor: Record<string, { value: number; waiting?: boolean } | undefined> = {
    "/contacts": counts.contacts !== undefined ? { value: counts.contacts } : undefined,
    "/dialer": counts.dialer !== undefined ? { value: counts.dialer } : undefined,
    "/messages": counts.messages !== undefined ? { value: counts.messages, waiting: counts.messages > 0 } : undefined,
  };

  return (
    <aside className="hidden w-[220px] shrink-0 flex-col border-r border-neutral-100 bg-[#fcfbfa] px-3 py-[22px] md:flex">
      <div className="px-2.5 pb-[22px]">
        <p className="font-serif text-lg font-semibold text-neutral-900">CallCaitlyn</p>
        {userEmail && <p className="mt-0.5 truncate text-sm text-neutral-400">{userEmail}</p>}
      </div>

      <button
        type="button"
        onClick={() => setQuickAddOpen(true)}
        className="mb-[22px] flex w-full items-center gap-2.5 rounded-[11px] bg-brand-600 px-3.5 py-3 text-[15px] font-semibold text-white"
      >
        <Plus size={17} /> Quick add
      </button>

      <nav className="flex-1 space-y-5 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-2.5 text-[11px] font-semibold uppercase tracking-[.08em] text-neutral-400">{group.label}</p>
            <div className="flex flex-col gap-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                const count = countFor[href];
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-[11px] px-3 py-3 text-base font-medium",
                      active ? "bg-neutral-100 font-semibold text-neutral-900" : "text-neutral-700 hover:bg-neutral-100/60",
                    )}
                  >
                    <Icon size={19} className={active ? "text-neutral-900" : "text-neutral-500"} />
                    {label}
                    {count && (
                      <span className={cn("ml-auto text-sm", count.waiting ? "font-semibold text-brand-600" : "text-neutral-400")}>
                        {count.value}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-neutral-100 px-2.5 pt-4">
        <SignOutButton />
      </div>

      {quickAddOpen && <QuickAddMenu onClose={() => setQuickAddOpen(false)} />}
    </aside>
  );
}
