"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { APP_TIMEZONE } from "@/lib/format-time";
import type { Slot } from "@/lib/crm/booking-availability";

const WEEKDAY_HEADERS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function dayKey(iso: string): string {
  return formatInTimeZone(iso, APP_TIMEZONE, "yyyy-MM-dd");
}

export function CalendarGridView({
  slots,
  selected,
  onSelect,
}: {
  slots: Slot[];
  selected: string | null;
  onSelect: (startAt: string) => void;
}) {
  const byDay = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const slot of slots) {
      const key = dayKey(slot.startAt);
      map.set(key, [...(map.get(key) ?? []), slot]);
    }
    return map;
  }, [slots]);

  const dayKeys = useMemo(() => [...byDay.keys()].sort(), [byDay]);
  const todayKey = formatInTimeZone(new Date(), APP_TIMEZONE, "yyyy-MM-dd");

  const [viewMonth, setViewMonth] = useState(() => {
    const first = dayKeys[0] ?? todayKey;
    const [y, m] = first.split("-").map(Number);
    return new Date(y, m - 1, 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(selected ? dayKey(selected) : (dayKeys[0] ?? null));

  const minMonthKey = (dayKeys[0] ?? todayKey).slice(0, 7);
  const maxMonthKey = (dayKeys[dayKeys.length - 1] ?? todayKey).slice(0, 7);
  const viewMonthKey = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, "0")}`;

  const gridStart = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const startOffset = gridStart.getDay();
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      return `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }),
  ];

  function changeMonth(delta: number) {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  return (
    <div className="flex flex-col gap-5 sm:flex-row">
      <div className="sm:w-[280px] sm:shrink-0">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            disabled={viewMonthKey <= minMonthKey}
            className="rounded-lg p-1.5 text-neutral-500 disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <p className="text-sm font-semibold text-neutral-900">{MONTH_NAMES[viewMonth.getMonth()]} {viewMonth.getFullYear()}</p>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            disabled={viewMonthKey >= maxMonthKey}
            className="rounded-lg p-1.5 text-neutral-500 disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAY_HEADERS.map((d, i) => (
            <span key={i} className="text-xs font-medium text-neutral-400">
              {d}
            </span>
          ))}
          {cells.map((key, i) => {
            if (!key) return <span key={i} />;
            const hasSlots = byDay.has(key);
            const isSelected = key === selectedDay;
            const isToday = key === todayKey;
            return (
              <button
                key={i}
                type="button"
                disabled={!hasSlots}
                onClick={() => setSelectedDay(key)}
                className={`relative aspect-square rounded-lg text-sm ${
                  isSelected
                    ? "bg-brand-600 font-semibold text-white"
                    : hasSlots
                      ? "font-medium text-neutral-900 hover:bg-neutral-100"
                      : "text-neutral-300"
                }`}
              >
                {Number(key.slice(-2))}
                {hasSlots && !isSelected && <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-brand-600" />}
                {isToday && !isSelected && <span className="absolute inset-x-2 top-0 h-0.5 rounded-full bg-neutral-300" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        {!selectedDay || !byDay.has(selectedDay) ? (
          <p className="py-6 text-center text-sm text-neutral-400">Pick a highlighted day to see times.</p>
        ) : (
          <>
            <p className="mb-2 text-sm font-semibold text-neutral-700">{formatInTimeZone(`${selectedDay}T12:00:00`, APP_TIMEZONE, "EEEE, MMM d")}</p>
            <div className="flex flex-wrap gap-2">
              {byDay.get(selectedDay)!.map((slot) => (
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
          </>
        )}
      </div>
    </div>
  );
}
