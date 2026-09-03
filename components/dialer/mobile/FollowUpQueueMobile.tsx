"use client";

import { useState } from "react";
import Link from "next/link";
import { PersonCard } from "@/components/dialer/mobile/PersonCard";
import { UpNextPeek } from "@/components/dialer/mobile/UpNextPeek";
import { BulkSendCard } from "@/components/dialer/mobile/BulkSendCard";
import { cn } from "@/lib/utils";
import type { DialerContact, DialerMode } from "@/lib/data/dialer";
import type { TextTemplate } from "@/types/database";

export function FollowUpQueueMobile({
  contacts,
  mode,
  activeTab,
  newCount,
  followupCount,
  defaultDraftTemplate,
}: {
  contacts: DialerContact[];
  mode: DialerMode;
  activeTab: "new" | "followup";
  newCount: number;
  followupCount: number;
  defaultDraftTemplate: TextTemplate | null;
}) {
  const [queue, setQueue] = useState(contacts);
  const current = queue[0];
  const startCount = contacts.length;

  return (
    <div className="px-4 pb-8 pt-5 md:hidden">
      <p className="font-serif text-2xl font-semibold text-neutral-900">Follow-ups</p>
      <p className="mt-0.5 text-[15px] text-neutral-500">
        {activeTab === "followup" ? "Post-event follow-ups" : "Untouched registrations"} · {queue.length} of {startCount}
      </p>

      <div className="mt-3 flex gap-1.5">
        <Link
          href="/dialer"
          className={cn(
            "h-11 flex-1 rounded-[12px] text-center text-[15px] font-semibold leading-[44px]",
            activeTab === "new" ? "bg-neutral-900 text-white" : "border border-neutral-200 text-neutral-700",
          )}
        >
          New registrations {newCount}
        </Link>
        <Link
          href="/dialer?tab=followup"
          className={cn(
            "h-11 flex-1 rounded-[12px] text-center text-[15px] font-semibold leading-[44px]",
            activeTab === "followup" ? "bg-neutral-900 text-white" : "border border-neutral-200 text-neutral-700",
          )}
        >
          Post-event {followupCount}
        </Link>
      </div>

      {startCount > 0 && (
        <div className="mt-3 flex gap-1">
          {Array.from({ length: Math.min(startCount, 6) }).map((_, i) => (
            <div key={i} className={cn("h-1.5 flex-1 rounded-full", i < startCount - queue.length ? "bg-brand-600" : "bg-neutral-200")} />
          ))}
        </div>
      )}

      <div className="mt-4">
        {current ? (
          <PersonCard contact={current} mode={mode} defaultDraftTemplate={defaultDraftTemplate} onAdvance={() => setQueue((q) => q.slice(1))} />
        ) : (
          <div className="rounded-[20px] border border-[#ebe9e7] bg-white p-8 text-center">
            <p className="text-[16px] font-medium text-neutral-600">
              {activeTab === "followup" ? "No one's waiting on a follow-up call." : "Nobody left to call — you're caught up."}
            </p>
          </div>
        )}
      </div>

      <UpNextPeek contacts={queue.slice(1)} />
      <BulkSendCard contacts={queue} label={activeTab === "followup" ? "Post-event follow-ups" : "New registrations"} />
    </div>
  );
}
