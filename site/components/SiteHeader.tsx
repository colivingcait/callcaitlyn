"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/about", label: "About" },
  { href: "/events", label: "Events" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-neutral-50/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="font-serif text-xl font-semibold text-neutral-900" onClick={() => setOpen(false)}>
          Caitlyn Verdugo
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors",
                pathname === link.href ? "text-brand-600" : "text-neutral-600 hover:text-neutral-900",
              )}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/contact"
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            Get in Touch
          </Link>
        </nav>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          className="text-neutral-700 md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-neutral-200/70 bg-neutral-50 px-4 pb-4 pt-2 md:hidden">
          <ul className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded-xl px-3 py-2.5 text-base font-medium",
                    pathname === link.href ? "bg-brand-50 text-brand-700" : "text-neutral-700 hover:bg-neutral-100",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/contact"
                onClick={() => setOpen(false)}
                className="mt-2 block rounded-xl bg-brand-600 px-3 py-2.5 text-center text-base font-medium text-white"
              >
                Get in Touch
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
