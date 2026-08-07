"use client";

import { useEffect, useRef } from "react";

// Chat threads should open scrolled to the most recent message, not the
// oldest - this is a plain scroll-into-view on mount rather than a fixed
// nested scroll container, so it works within the app's normal page scroll.
export function ScrollToBottomOnLoad() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ block: "end" });
  }, []);

  return <div ref={ref} />;
}
