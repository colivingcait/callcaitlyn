"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PUBLIC_SITE_URL } from "@/lib/public-urls";
import styles from "./SiteNav.module.css";
import "./site-nav.css";

// Logged-out ColivingCait nav (components/Nav.tsx). Plain <a> tags: these
// pages are served from the CRM, and next/link would stay inside this app.
// DM Sans comes from PublicChrome (--font-dm-sans).

const LINKS: { href: string; label: string; listings?: boolean }[] = [
  { href: `${PUBLIC_SITE_URL}/about`, label: "About" },
  { href: `${PUBLIC_SITE_URL}/what-is-coliving`, label: "What Is Coliving" },
  { href: `${PUBLIC_SITE_URL}/learn`, label: "Learn With Me" },
  { href: `${PUBLIC_SITE_URL}/partner-with-me`, label: "Partner" },
  { href: `${PUBLIC_SITE_URL}/buy-and-sell`, label: "Buy & Sell" },
  { href: `${PUBLIC_SITE_URL}/community`, label: "Community" },
  { href: `${PUBLIC_SITE_URL}/listings`, label: "Listings", listings: true },
];

const SIGN_IN_HREF = `${PUBLIC_SITE_URL}/auth/signin?callbackUrl=/courses`;
const BOOK_HREF = `${PUBLIC_SITE_URL}/contact`;
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
  const listingsActive = onListingsPath(pathname);

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
    <header className={`public-site-nav ${styles.header} ${scrolled ? styles.scrolled : ""}`} data-om-noprint>
      <div className={styles.inner}>
        <a href={PUBLIC_SITE_URL} aria-label="ColivingCait — home" className={styles.logo}>
          {/* Absolute www URL, same asset the marketing site uses. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_SRC} alt="ColivingCait" />
        </a>

        <ul className={styles.desktop}>
          {LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} className={`${styles.link} ${link.listings && listingsActive ? styles.active : ""}`}>
                {link.label}
              </a>
            </li>
          ))}
          <li>
            <a href={SIGN_IN_HREF} className={styles.link}>
              Sign In
            </a>
          </li>
          <li>
            <a href={BOOK_HREF} className={styles.book}>
              Book a Call
            </a>
          </li>
        </ul>

        <button type="button" className={styles.burger} aria-label="Toggle navigation" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <span className={`${styles.bar} ${open ? styles.open1 : ""}`} />
          <span className={`${styles.bar} ${open ? styles.open2 : ""}`} />
          <span className={`${styles.bar} ${open ? styles.open3 : ""}`} />
        </button>
      </div>

      {open && (
        <div className={styles.drawer}>
          <nav className={styles.drawerNav}>
            {LINKS.map((link) => (
              <a key={link.href} href={link.href} className={styles.drawerLink} onClick={() => setOpen(false)}>
                {link.label}
              </a>
            ))}
            <a href={SIGN_IN_HREF} className={styles.drawerLink} onClick={() => setOpen(false)}>
              Sign In
            </a>
            <a href={BOOK_HREF} className={`${styles.book} ${styles.drawerBook}`} onClick={() => setOpen(false)}>
              Book a Call
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
