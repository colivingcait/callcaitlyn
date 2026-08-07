"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";
import { SignOutButton } from "./SignOutButton";
import { cn } from "@/lib/utils";

export function Sidebar({ userEmail }: { userEmail?: string | null }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-neutral-200 bg-white md:flex">
      <div className="px-5 py-6">
        <h1 className="text-lg font-semibold text-neutral-900">CallCaitlyn</h1>
        <p className="text-xs text-neutral-400">Real Estate CRM</p>
      </div>
      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                    active ? "bg-brand-50 text-brand-700" : "text-neutral-600 hover:bg-neutral-100",
                  )}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-neutral-100 px-5 py-4">
        {userEmail && <p className="mb-2 truncate text-xs text-neutral-400">{userEmail}</p>}
        <SignOutButton />
      </div>
    </aside>
  );
}
