"use client";

import { useEffect, useRef } from "react";

// Chat threads should open scrolled to the most recent message, not the
// oldest - re-run when `token` changes (new last message after send /
// router.refresh) so the newest bubble isn't left under the composer.
export function ScrollToBottomOnLoad({ token }: { token?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ block: "end" });
  }, [token]);

  return <div ref={ref} />;
}
