"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LinkButton } from "@/components/ui";

const NAV_LINKS = [
  { href: "/about", label: "About" },
  { href: "/coliving", label: "Coliving" },
  { href: "/house-hacking", label: "House Hacking" },
  { href: "/work-with-me", label: "Work With Me" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-soft bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-page items-center justify-between px-8 py-5 lg:px-[60px]">
        <Link href="/" className="font-heading text-xl font-medium text-charcoal" onClick={() => setOpen(false)}>
          Caitlyn <em>Verdugo</em>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "font-sans text-sm font-medium transition-colors",
                pathname === link.href ? "text-gold" : "text-warmgray hover:text-charcoal",
              )}
            >
              {link.label}
            </Link>
          ))}
          <LinkButton href="/contact" variant="primary" size="sm">
            Book a Call
          </LinkButton>
        </nav>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          className="relative h-6 w-7 text-charcoal md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          <span
            className={cn(
              "absolute left-0 right-0 h-px bg-current transition-transform duration-300",
              open ? "top-1/2 rotate-45" : "top-1.5",
            )}
          />
          <span
            className={cn("absolute left-0 right-0 top-1/2 h-px bg-current transition-opacity duration-300", open && "opacity-0")}
          />
          <span
            className={cn(
              "absolute left-0 right-0 h-px bg-current transition-transform duration-300",
              open ? "top-1/2 -rotate-45" : "bottom-1.5",
            )}
          />
        </button>
      </div>

      {open && (
        <nav className="border-t border-soft bg-white px-8 pb-6 pt-2 md:hidden">
          <ul className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block py-2.5 font-sans text-base font-medium",
                    pathname === link.href ? "text-gold" : "text-warmgray hover:text-charcoal",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="pt-2">
              <LinkButton href="/contact" variant="primary" size="md" className="w-full" onClick={() => setOpen(false)}>
                Book a Call
              </LinkButton>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
