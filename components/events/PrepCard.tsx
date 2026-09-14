import Link from "next/link";
import { MessageSquareText, QrCode, Printer } from "lucide-react";
import { formatLocal } from "@/lib/format-time";
import type { EventEntry } from "@/lib/data/events";

function daysAway(startsAt: string): number {
  return Math.ceil((new Date(startsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

// The Next up half of the portal - only possible now that an event can
// exist as a record before anyone's registered (see migration 0068).
// "Said yes / no answer" (the day-before text's reply tracking) isn't
// built - text blasts don't record per-recipient reply classification
// today - so this only shows what's actually known ahead of the event:
// who's registered, and how many of them have never been to one before.
export function PrepCard({ event, firstTimerCount }: { event: EventEntry; firstTimerCount: number }) {
  if (!event.startsAt) return null;
  const days = daysAway(event.startsAt);

  return (
    <div className="rounded-[20px] bg-neutral-900 p-5">
      <p className="text-[13px] font-semibold uppercase tracking-[.05em] text-white/60">
        Next up · {days <= 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`}
      </p>
      <p className="mt-1.5 font-serif text-2xl font-semibold text-white">{event.label}</p>
      <p className="mt-1 text-[15px] text-white/72">{formatLocal(event.startsAt, "EEEE, MMMM d 'at' h:mm a")}</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/10 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[.09em] text-white/50">Registered</p>
          <p className="mt-1 font-serif text-[22px] font-semibold text-white">{event.counts.registered}</p>
        </div>
        <div className="rounded-2xl bg-white/10 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[.09em] text-white/50">First-timers</p>
          <p className="mt-1 font-serif text-[22px] font-semibold text-white">{firstTimerCount}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/sequences?event=${encodeURIComponent(event.label)}`}
          className="flex h-12 items-center gap-2 rounded-xl bg-white px-4 text-[15px] font-semibold text-neutral-900"
        >
          <MessageSquareText size={16} /> Send the day-before text
        </Link>
        <Link href={`/checkin/${event.series}`} target="_blank" className="flex h-12 items-center gap-2 rounded-xl border border-white/28 px-4 text-[15px] font-semibold text-white">
          <QrCode size={16} /> Check-in link
        </Link>
        <span className="flex h-12 items-center gap-2 rounded-xl border border-white/28 px-4 text-[15px] font-semibold text-white">
          <Printer size={16} /> Name tags · {event.counts.registered}
        </span>
      </div>
    </div>
  );
}
