"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MessageCircle, Search, Users } from "lucide-react";
import { daysOutLabel } from "@/lib/crm/today-v1";
import { eventPlaceLabel, eventsHubStats, registrantIdsForMessage } from "@/lib/crm/events-sot";
import { formatLocal } from "@/lib/format-time";
import { NewEventButton } from "@/components/events/NewEventButton";
import { MessageRegistrantsModal } from "@/components/events/MessageRegistrantsModal";
import { cn } from "@/lib/utils";
import type { EventEntry } from "@/lib/data/events";

type Tab = "upcoming" | "past";

export function EventsHub({
  upcoming,
  past,
}: {
  upcoming: EventEntry[];
  past: EventEntry[];
}) {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [query, setQuery] = useState("");
  const [messageEvent, setMessageEvent] = useState<EventEntry | null>(null);
  const stats = eventsHubStats([...upcoming, ...past]);
  const source = tab === "upcoming" ? upcoming : past;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return source;
    return source.filter((event) => event.label.toLowerCase().includes(q) || event.seriesLabel.toLowerCase().includes(q));
  }, [query, source]);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[32px] font-semibold leading-9 tracking-[-0.03em] text-neutral-900 lg:text-[40px]">Events</h1>
          <p className="mt-1.5 text-[15px] text-neutral-500">Workshops &amp; meetups · registrants live here</p>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:min-w-[320px]">
          <label className="relative min-w-0 flex-1 sm:max-w-[280px]">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search events..."
              className="h-11 w-full rounded-full border border-[#eadfd6] bg-white pl-9 pr-4 text-[14px] text-neutral-800 outline-none focus:border-[#c45c4a]/40 focus:ring-2 focus:ring-[#c45c4a]/15"
            />
          </label>
          <NewEventButton />
        </div>
      </div>

      <div className="mt-6 inline-flex rounded-full bg-[#f3e4dc]/60 p-1">
        {(
          [
            ["upcoming", "Upcoming"],
            ["past", "Past"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "rounded-full px-4 py-1.5 text-[14px] font-medium",
              tab === key ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-[#eadfd6] bg-white px-5 py-10 text-center text-[15px] text-neutral-400">
            {tab === "upcoming" ? "Nothing upcoming yet — add an event to get a roster." : "Nothing past yet — upcoming meetups stay here until they end."}
          </p>
        ) : (
          filtered.map((event) => {
            const when = event.startsAt ?? event.date;
            return (
              <article key={event.key} className="overflow-hidden rounded-[20px] border border-[#eadfd6] bg-white shadow-card">
                <div className="flex flex-col sm:flex-row">
                  <div className="flex shrink-0 flex-row items-center gap-3 bg-[#c45c4a] px-5 py-4 text-white sm:w-[120px] sm:flex-col sm:justify-center sm:px-4 sm:py-6">
                    <p className="text-[13px] font-medium uppercase tracking-[.08em]">{formatLocal(when, "MMMM")}</p>
                    <p className="font-display text-[40px] font-semibold leading-none">{formatLocal(when, "d")}</p>
                    <p className="text-[13px] font-medium">{formatLocal(when, "EEEE")}</p>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 px-5 py-5 lg:flex-row lg:items-center lg:gap-6">
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-display text-[26px] font-semibold tracking-[-0.02em] text-neutral-900">{event.label}</h2>
                      <p className="mt-1 truncate text-[15px] text-neutral-500">
                        {daysOutLabel(when)} · {eventPlaceLabel(event.location, event.seriesLabel)}
                        {event.startsAt ? ` · ${formatLocal(event.startsAt, "h:mm a")}` : ""}
                      </p>
                      <p className="mt-3 text-[18px] font-semibold text-[#c45c4a]">
                        {event.counts.registered} registered
                        <span className="ml-3 font-medium text-neutral-500">{event.firstTimerCount} first-timers</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-5">
                      <Link
                        href={`/events/${encodeURIComponent(event.key)}`}
                        className="inline-flex items-center gap-2 text-[15px] font-medium text-[#c45c4a]"
                      >
                        <Users size={18} strokeWidth={1.7} />
                        View roster
                      </Link>
                      <button
                        type="button"
                        onClick={() => setMessageEvent(event)}
                        className="inline-flex items-center gap-2 text-[15px] font-medium text-[#c45c4a]"
                      >
                        <MessageCircle size={18} strokeWidth={1.7} />
                        Message registrants
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      <div className="mt-6 grid max-w-md grid-cols-2 gap-6 rounded-[20px] border border-[#eadfd6] bg-white px-6 py-5">
        <div>
          <p className="text-[13px] text-neutral-500">Registered this month</p>
          <p className="mt-1 font-display text-[32px] font-semibold text-neutral-900">{stats.registeredThisMonth}</p>
        </div>
        <div>
          <p className="text-[13px] text-neutral-500">Avg show-up</p>
          <p className="mt-1 font-display text-[32px] font-semibold text-neutral-900">{stats.avgShowUp}%</p>
        </div>
      </div>

      {messageEvent && (
        <MessageRegistrantsModal
          eventKey={messageEvent.key}
          eventLabel={messageEvent.label}
          contactIds={registrantIdsForMessage(messageEvent.people)}
          onClose={() => setMessageEvent(null)}
        />
      )}
    </div>
  );
}
