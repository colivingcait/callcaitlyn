"use client";

import { useMemo } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { APP_TIMEZONE } from "@/lib/format-time";
import type { Slot } from "@/lib/crm/booking-availability";

export function ListView({ slots, selected, onSelect }: { slots: Slot[]; selected: string | null; onSelect: (startAt: string) => void }) {
  const groups = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const slot of slots) {
      const key = formatInTimeZone(slot.startAt, APP_TIMEZONE, "yyyy-MM-dd");
      map.set(key, [...(map.get(key) ?? []), slot]);
    }
    return map;
  }, [slots]);
  const dayKeys = [...groups.keys()].sort();

  if (dayKeys.length === 0) {
    return <p className="py-6 text-center text-[15px] text-neutral-500">Nothing open right now — check back soon.</p>;
  }

  return (
    <div className="space-y-4">
      {dayKeys.map((key) => (
        <div key={key}>
          <p className="mb-2 text-sm font-semibold text-neutral-700">{formatInTimeZone(`${key}T12:00:00`, APP_TIMEZONE, "EEEE, MMM d")}</p>
          <div className="flex flex-wrap gap-2">
            {groups.get(key)!.map((slot) => (
              <button
                key={slot.startAt}
                type="button"
                onClick={() => onSelect(slot.startAt)}
                className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                  selected === slot.startAt ? "border-brand-600 bg-brand-600 text-white" : "border-neutral-200 text-neutral-700 hover:border-neutral-300"
                }`}
              >
                {formatInTimeZone(slot.startAt, APP_TIMEZONE, "h:mm a")}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
