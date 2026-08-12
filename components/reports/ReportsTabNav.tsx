"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/reports/leads", label: "Leads" },
  { href: "/reports/events", label: "Events" },
  { href: "/reports/performance", label: "Performance" },
  { href: "/reports/money", label: "Money" },
];

export function ReportsTabNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-neutral-200">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium",
              active ? "border-brand-600 text-brand-700" : "border-transparent text-neutral-500 hover:text-neutral-700",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
