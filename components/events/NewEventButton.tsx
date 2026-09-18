"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { createEvent } from "@/app/(app)/events/actions";
import type { EventSeriesKey } from "@/lib/crm/nearest-event";

// One of the three things that genuinely needs the events table (see
// migration 0068) - before this, an event only existed once a
// registration or check-in arrived, so there was no way to set up "Next
// up" ahead of time.
export function NewEventButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [series, setSeries] = useState<EventSeriesKey>("house_hacking");
  const [name, setName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !startsAt || !endsAt) return;
    setSaving(true);
    setError("");
    const result = await createEvent({ series, name: name.trim(), startsAt, endsAt });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex h-11 items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 text-sm font-semibold text-white">
        <Plus size={15} /> New event
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-serif text-xl font-semibold text-neutral-900">New event</p>
          <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Series</label>
            <select value={series} onChange={(e) => setSeries(e.target.value as EventSeriesKey)} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm">
              <option value="house_hacking">House Hacking</option>
              <option value="womens_rei">Women&apos;s REI</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="House Hacking Meetup · October"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Starts</label>
              <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Ends</label>
              <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button type="submit" disabled={saving || !name.trim() || !startsAt || !endsAt} className="h-11 w-full rounded-xl bg-neutral-900 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? "Creating…" : "Create event"}
          </button>
        </form>
      </div>
    </div>
  );
}
