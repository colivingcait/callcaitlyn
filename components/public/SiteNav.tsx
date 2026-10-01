"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PUBLIC_SITE_URL } from "@/lib/public-urls";
import "./site-nav.css";

// Port of ColivingCait components/Nav.tsx (logged-out). Same structure and
// Tailwind classes. Plain <a> tags with absolute www URLs: these pages are
// proxied, and next/link would prefetch ?_rsc= against this origin (404).
// Book a Call goes to /book. DM Sans is set here because the CRM body font
// is not the marketing site's.

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const links: { href: string; label: string; listings?: boolean }[] = [
  { href: `${PUBLIC_SITE_URL}/about`, label: "About" },
  { href: `${PUBLIC_SITE_URL}/what-is-coliving`, label: "What Is Coliving" },
  { href: `${PUBLIC_SITE_URL}/learn`, label: "Learn With Me" },
  { href: `${PUBLIC_SITE_URL}/partner-with-me`, label: "Partner" },
  { href: `${PUBLIC_SITE_URL}/buy-and-sell`, label: "Buy & Sell" },
  { href: `${PUBLIC_SITE_URL}/community`, label: "Community" },
  { href: `${PUBLIC_SITE_URL}/listings`, label: "Listings", listings: true },
];

const SIGN_IN_HREF = `${PUBLIC_SITE_URL}/auth/signin?callbackUrl=/courses`;
const BOOK_HREF = `${PUBLIC_SITE_URL}/book`;
const LOGO_SRC = `${PUBLIC_SITE_URL}/images/colivingcait-logo.png`;

function onListingsPath(pathname: string): boolean {
  return (
    pathname === "/listing" ||
    pathname.startsWith("/listing/") ||
    pathname === "/listings" ||
    pathname.startsWith("/listings/") ||
    pathname === "/public-listings" ||
    pathname.startsWith("/public-listings/")
  );
}

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname() ?? "";

  const linkClass = (active: boolean) =>
    cn(
      "relative text-[13px] tracking-[0.02em] transition-colors duration-200",
      "after:content-[''] after:absolute after:-bottom-1 after:left-0 after:h-px after:bg-gold",
      "after:transition-[width] after:duration-[350ms] after:ease-brand",
      active
        ? "text-charcoal font-medium after:w-full"
        : "text-warmgray font-normal after:w-0 hover:text-charcoal hover:after:w-full",
    );

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header
      data-om-noprint
      className={cn(
        "public-site-nav fixed inset-x-0 top-0 z-[100] px-8 lg:px-[60px] transition-all duration-500 ease-brand border-b",
        "font-dm font-light leading-[1.8] antialiased",
        scrolled
          ? "bg-white/95 [backdrop-filter:blur(24px)] [-webkit-backdrop-filter:blur(24px)] border-soft"
          : "bg-transparent border-transparent",
      )}
    >
      <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between py-5">
        <a href={PUBLIC_SITE_URL} aria-label="ColivingCait — home" className="inline-flex items-center hover:opacity-70 transition-opacity">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_SRC} alt="ColivingCait" width={200} height={40} className="h-7 w-auto" />
        </a>

        <ul className="hidden lg:flex items-center gap-9 list-none">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className={linkClass(Boolean(l.listings && onListingsPath(pathname)))}>
                {l.label}
              </a>
            </li>
          ))}

          <li>
            <a href={SIGN_IN_HREF} className={linkClass(false)}>
              Sign In
            </a>
          </li>

          <li>
            <a
              href={BOOK_HREF}
              className="bg-charcoal text-white px-7 py-3 text-[11px] font-medium uppercase tracking-[0.1em] transition-all duration-300 hover:bg-gold hover:-translate-y-px inline-block"
            >
              Book a Call
            </a>
          </li>
        </ul>

        <button
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="lg:hidden inline-flex h-10 w-10 flex-col items-center justify-center gap-[5px] cursor-pointer"
        >
          <span className={cn("block h-[1.5px] w-6 bg-charcoal transition", open && "translate-y-[6.5px] rotate-45")} />
          <span className={cn("block h-[1.5px] w-6 bg-charcoal transition", open && "opacity-0")} />
          <span className={cn("block h-[1.5px] w-6 bg-charcoal transition", open && "-translate-y-[6.5px] -rotate-45")} />
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-soft bg-white/95 [backdrop-filter:blur(24px)]">
          <nav className="flex flex-col px-2 py-4">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-3 text-[13px] tracking-[0.02em] text-charcoal hover:text-gold"
              >
                {l.label}
              </a>
            ))}

            <a href={SIGN_IN_HREF} onClick={() => setOpen(false)} className="py-3 text-[13px] tracking-[0.02em] text-charcoal hover:text-gold">
              Sign In
            </a>

            <a
              href={BOOK_HREF}
              onClick={() => setOpen(false)}
              className="mt-3 bg-charcoal text-white px-7 py-3 text-[11px] font-medium uppercase tracking-[0.1em] text-center hover:bg-gold transition-colors"
            >
              Book a Call
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
