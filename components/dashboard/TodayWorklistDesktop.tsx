"use client";

import { useState } from "react";
import { dismissReplyOwed, clearFollowUp, dismissRegisteredNoFollowUp, markKnownPersonally } from "@/app/(app)/today-actions";
import { WorklistGroup } from "@/components/dashboard/WorklistGroup";
import { BookingRequestRow } from "@/components/scheduling/BookingRequestRow";
import { TextAllButton } from "@/components/dashboard/TextAllButton";
import { cn } from "@/lib/utils";
import type { WorklistPerson } from "@/lib/data/today";
import type { BookingRequestWithContact } from "@/lib/data/scheduling";

export type TodayDesktopChipKey = "late" | "dueToday" | "owed" | "registered" | "meetings";

// Desktop's version of the same model the phone already had (TodayWorklist):
// one list card behind a row of chips, instead of five always-open
// accordions. Registered gets its own banner + a two-option dismiss menu
// (see RegisteredRowMenu); Meetings reuses BookingRequestRow directly since
// its shape (Approve/Decline, no phone-based dismiss) doesn't fit
// WorklistGroup's row.
export function TodayWorklistDesktop({
  groups,
  bookingRequests,
}: {
  groups: Record<Exclude<TodayDesktopChipKey, "meetings">, WorklistPerson[]>;
  bookingRequests: BookingRequestWithContact[];
}) {
  const chips: { key: TodayDesktopChipKey; label: string }[] = [
    { key: "late", label: `Late ${groups.late.length}` },
    { key: "dueToday", label: `Due today ${groups.dueToday.length}` },
    { key: "owed", label: `Owed a reply ${groups.owed.length}` },
    { key: "registered", label: `Registered ${groups.registered.length}` },
    { key: "meetings", label: `Meetings ${bookingRequests.length}` },
  ];
  const firstNonEmpty = chips.find((c) => (c.key === "meetings" ? bookingRequests.length > 0 : groups[c.key].length > 0))?.key ?? "late";
  const [active, setActive] = useState<TodayDesktopChipKey>(firstNonEmpty);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => setActive(chip.key)}
            className={cn(
              "flex h-11 shrink-0 items-center whitespace-nowrap rounded-full px-4 text-sm font-medium",
              active === chip.key ? "bg-neutral-900 text-white" : "border border-neutral-200 bg-white text-neutral-600",
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {active === "registered" && groups.registered.length > 0 && (
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-[#ebe9e7] bg-white px-[18px] py-3.5">
          <p className="min-w-0 flex-1 text-[15px] text-neutral-700">Registered for something and hasn&apos;t heard from you since.</p>
          <TextAllButton contactIds={groups.registered.map((p) => p.id)} label="Registered, no follow-up" />
        </div>
      )}

      <div className="mt-3 overflow-hidden rounded-2xl border border-[#ebe9e7] bg-white">
        {active === "meetings" ? (
          bookingRequests.length === 0 ? (
            <p className="px-4 py-6 text-[15px] text-neutral-400">Nothing here right now.</p>
          ) : (
            bookingRequests.map((r) => <BookingRequestRow key={r.id} request={r} />)
          )
        ) : active === "owed" ? (
          <WorklistGroup people={groups.owed} onDismiss={dismissReplyOwed} dismissLabel="Doesn't need a reply" />
        ) : active === "registered" ? (
          <WorklistGroup
            people={groups.registered}
            onDismissContact={dismissRegisteredNoFollowUp}
            dismissContactLabel="No follow-up needed"
            onNeverQueue={markKnownPersonally}
          />
        ) : (
          <WorklistGroup people={groups[active]} onDismissContact={clearFollowUp} dismissContactLabel="Clear follow-up" />
        )}
      </div>

      {active === "registered" && groups.registered.length > 0 && (
        <p className="mt-3 px-0.5 text-sm leading-[21px] text-neutral-400">
          People marked &quot;never queue&quot; are listed in Settings → People you know, so the list is reviewable rather than invisible.
        </p>
      )}
    </div>
  );
}
