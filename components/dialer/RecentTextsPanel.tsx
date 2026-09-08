"use client";

import { useEffect, useState } from "react";
import { getRecentTextsForContact } from "@/app/(app)/dialer/actions";
import { relativeTime } from "@/lib/format-time";
import type { TextThreadMessage } from "@/lib/crm/recent-texts";

// Chat-bubble thread, not a form field - this is meant to be read before
// deciding what (or whether) to text, same reasoning as the bulk blast's
// audience preview (lib/crm/recent-texts.ts). Used both as a desktop
// sidebar (DialerCallModal) and inline on mobile (PersonCard).
export function RecentTextsPanel({ contactId }: { contactId: string }) {
  const [texts, setTexts] = useState<TextThreadMessage[] | null>(null);

  useEffect(() => {
    setTexts(null);
    getRecentTextsForContact(contactId).then(setTexts);
  }, [contactId]);

  if (texts === null) {
    return <p className="px-1 text-xs text-neutral-400">Loading recent texts…</p>;
  }
  if (texts.length === 0) {
    return <p className="px-1 text-xs text-neutral-400">No texts with this person in the last month.</p>;
  }

  return (
    <div className="space-y-2">
      {texts.map((t, i) => (
        <div
          key={i}
          className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-[18px] ${
            t.direction === "inbound" ? "mr-auto bg-neutral-100 text-neutral-800" : "ml-auto bg-brand-600 text-white"
          }`}
        >
          <p className="whitespace-pre-wrap">{t.body}</p>
          <p className={`mt-1 text-[10px] ${t.direction === "inbound" ? "text-neutral-400" : "text-brand-100"}`}>{relativeTime(t.occurredAt)}</p>
        </div>
      ))}
    </div>
  );
}
