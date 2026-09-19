"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { saveEventCadence } from "@/app/(app)/events/actions";
import { EMAIL_INVITE_DAYS_BEFORE } from "@/lib/crm/today-v1";
import type { EventEntry } from "@/lib/data/events";

export function EventCadencePanel({ event }: { event: EventEntry }) {
  const [textDays, setTextDays] = useState(event.cadenceTextDaysBefore);
  const [showOnToday, setShowOnToday] = useState(event.cadenceShowOnToday);
  const [location, setLocation] = useState(event.location ?? "");
  const [editing, setEditing] = useState<"email" | "text" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function persist(next = { textDays, showOnToday, location }) {
    setSaving(true);
    setError("");
    setSaved(false);
    const result = await saveEventCadence({
      recordId: event.recordId,
      series: event.series,
      name: event.label,
      startsAt: event.startsAt ?? event.date,
      endsAt: event.endsAt,
      eventbriteEventId: event.eventId,
      location: next.location.trim() || null,
      cadenceTextDaysBefore: next.textDays,
      cadenceShowOnToday: next.showOnToday,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    setEditing(null);
  }

  return (
    <div className="rounded-[20px] border border-[#eadfd6] bg-white px-6 py-6 lg:px-8">
      <h2 className="font-display text-[22px] font-semibold text-neutral-900">Communication cadence</h2>

      <ol className="relative mt-6 space-y-8 border-l border-[#eadfd6] pl-6">
        <li>
          <span className="absolute -left-[9px] flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#c45c4a] text-white">
            <Users size={10} />
          </span>
          <p className="font-semibold text-neutral-900">Step 1: Email invite</p>
          <dl className="mt-2 grid grid-cols-[120px_1fr] gap-y-1 text-[14px]">
            <dt className="text-neutral-500">When:</dt>
            <dd>{EMAIL_INVITE_DAYS_BEFORE} days before</dd>
            <dt className="text-neutral-500">Audience:</dt>
            <dd>Past attendees (ever attended)</dd>
            <dt className="text-neutral-500">Channel:</dt>
            <dd>Email</dd>
            <dt className="text-neutral-500">Status:</dt>
            <dd className="flex items-center gap-2">
              <span className="rounded-full bg-[#e8f5e9] px-2 py-0.5 text-[12px] font-medium text-[#2e7d32]">Scheduled</span>
              <button type="button" onClick={() => setEditing(editing === "email" ? null : "email")} className="text-[13px] font-medium text-[#c45c4a]">
                Edit
              </button>
            </dd>
          </dl>
          {editing === "email" && (
            <p className="mt-2 text-[13px] text-neutral-500">Email invite stays T-{EMAIL_INVITE_DAYS_BEFORE} to anyone who has ever attended this series.</p>
          )}
        </li>
        <li>
          <span className="absolute -left-[9px] flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#c45c4a] text-white">
            <Users size={10} />
          </span>
          <p className="font-semibold text-neutral-900">Step 2: Text reminder</p>
          <dl className="mt-2 grid grid-cols-[120px_1fr] gap-y-1 text-[14px]">
            <dt className="text-neutral-500">When:</dt>
            <dd>
              {editing === "text" ? (
                <label className="inline-flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={textDays}
                    onChange={(e) => setTextDays(Math.max(1, Number(e.target.value) || 1))}
                    className="h-9 w-16 rounded-lg border border-[#eadfd6] px-2 text-[14px]"
                  />
                  days before
                </label>
              ) : (
                `${textDays} days before`
              )}
            </dd>
            <dt className="text-neutral-500">Audience:</dt>
            <dd>Registrants</dd>
            <dt className="text-neutral-500">Channel:</dt>
            <dd>SMS</dd>
            <dt className="text-neutral-500">Status:</dt>
            <dd className="flex items-center gap-2">
              <span className="rounded-full bg-[#e8f5e9] px-2 py-0.5 text-[12px] font-medium text-[#2e7d32]">Scheduled</span>
              <button type="button" onClick={() => setEditing(editing === "text" ? null : "text")} className="text-[13px] font-medium text-[#c45c4a]">
                Edit
              </button>
            </dd>
          </dl>
          {editing === "text" && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="text-[13px] text-neutral-500">
                Venue
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="The Hive"
                  className="ml-2 h-9 rounded-lg border border-[#eadfd6] px-2 text-[14px]"
                />
              </label>
              <button
                type="button"
                disabled={saving}
                onClick={() => void persist()}
                className="h-9 rounded-lg bg-[#c45c4a] px-3 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          )}
        </li>
      </ol>

      <p className="mt-6 text-[14px] text-neutral-400">+ Add step</p>
      <p className="mt-1 text-[13px] text-neutral-400">Day-before text (T-1) is parked. Message all still offers Text &amp; Next vs Campaigns blast for manual sends.</p>

      <label className="mt-6 flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={showOnToday}
          onClick={() => {
            const next = !showOnToday;
            setShowOnToday(next);
            void persist({ textDays, showOnToday: next, location });
          }}
          className={`relative h-6 w-11 rounded-full transition-colors ${showOnToday ? "bg-[#c45c4a]" : "bg-neutral-300"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${showOnToday ? "left-5" : "left-0.5"}`} />
        </button>
        <span className="text-[15px] text-neutral-800">Show due steps on Today</span>
      </label>

      {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}
      {saved && !error && <p className="mt-3 text-[13px] text-neutral-500">Cadence saved.</p>}
    </div>
  );
}
