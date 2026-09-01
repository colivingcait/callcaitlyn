import type { SupabaseClient } from "@supabase/supabase-js";
import { listUpcomingEvents } from "@/lib/google/calendar";
import type { WeeklyHours, Weekday } from "@/types/database";

const WEEKDAY_KEYS: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export type Slot = { startAt: string; endAt: string };

// Deterministic per-slot "looks busier" filter (her ask: hide some open
// time so the page doesn't read as wide open). Same slot always reads the
// same way to every visitor and across a reload, rather than flickering -
// this is purely a display choice, her real capacity (what's actually
// bookable if someone lands on the exact right time) is unaffected.
function slotVisible(ownerId: string, startAtIso: string, visiblePct: number): boolean {
  if (visiblePct >= 100) return true;
  let hash = 0;
  const key = `${ownerId}:${startAtIso}`;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return hash % 100 < visiblePct;
}

export type AvailabilitySettings = {
  durationMinutes: number;
  daysOut: number;
  visibleSlotPct: number;
  weeklyHours: WeeklyHours;
};

// Real Google Calendar busy time, plus any of her own pending/approved
// booking requests (so two visitors can't both land on the same not-yet-
// synced-to-Google slot), subtracted from her configured weekly hours -
// then the visible_slot_pct filter is applied last, on top of what's
// genuinely open.
export async function computeAvailableSlots(admin: SupabaseClient, ownerId: string, settings: AvailabilitySettings): Promise<Slot[]> {
  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + settings.daysOut * 24 * 60 * 60 * 1000).toISOString();

  const [events, { data: pendingOrApproved }] = await Promise.all([
    listUpcomingEvents(admin, ownerId, timeMin, timeMax),
    admin
      .from("booking_requests")
      .select("starts_at, ends_at")
      .eq("owner_id", ownerId)
      .in("status", ["pending", "approved"])
      .gte("starts_at", timeMin)
      .lte("starts_at", timeMax),
  ]);

  const busy: { start: number; end: number }[] = events.map((e) => ({
    start: new Date(e.startAt).getTime(),
    end: new Date(e.endAt).getTime(),
  }));
  for (const b of pendingOrApproved ?? []) {
    busy.push({ start: new Date(b.starts_at).getTime(), end: new Date(b.ends_at).getTime() });
  }

  const durationMs = settings.durationMinutes * 60_000;
  const slots: Slot[] = [];
  const notBefore = new Date(now);
  notBefore.setMinutes(Math.ceil(notBefore.getMinutes() / 30) * 30, 0, 0);

  for (let dayOffset = 0; dayOffset <= settings.daysOut; dayOffset++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
    const hours = settings.weeklyHours[WEEKDAY_KEYS[day.getDay()]];
    if (!hours?.enabled) continue;

    const [startH, startM] = hours.start.split(":").map(Number);
    const [endH, endM] = hours.end.split(":").map(Number);
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), startH, startM, 0, 0).getTime();
    const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), endH, endM, 0, 0).getTime();

    for (let t = dayStart; t + durationMs <= dayEnd; t += durationMs) {
      if (t < notBefore.getTime()) continue;
      const slotEnd = t + durationMs;
      if (busy.some((b) => t < b.end && slotEnd > b.start)) continue;

      const startIso = new Date(t).toISOString();
      if (!slotVisible(ownerId, startIso, settings.visibleSlotPct)) continue;

      slots.push({ startAt: startIso, endAt: new Date(slotEnd).toISOString() });
    }
  }

  return slots;
}
