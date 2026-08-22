"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// One IntersectionObserver per page, watching every .reveal element and
// adding .visible once it's ~12% into the viewport - see the .reveal rule
// in globals.css. Re-runs on route change since navigation swaps the DOM
// without a full page reload.
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const elements = document.querySelectorAll(".reveal");
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
