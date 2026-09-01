"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { computeAvailableSlots, type Slot } from "@/lib/crm/booking-availability";
import { findOrCreateContact } from "@/lib/crm/find-or-create-contact";
import { notifyNewLead } from "@/lib/push/send-push";
import type { SchedulingSettings, WeeklyHours } from "@/types/database";

// Public, unauthenticated by design - whoever she texted the link to
// opens this on their own phone, no login. Same pattern as
// app/n/[slug]/actions.ts: every action here goes through the admin
// client scoped to the single owner account, not a user session.
const OWNER_ID = process.env.CRM_OWNER_USER_ID;
const SLUG_FORMAT = /^[A-Za-z0-9_-]{8}$/;

const DEFAULT_WEEKLY_HOURS: WeeklyHours = {
  mon: { enabled: true, start: "09:00", end: "17:00" },
  tue: { enabled: true, start: "09:00", end: "17:00" },
  wed: { enabled: true, start: "09:00", end: "17:00" },
  thu: { enabled: true, start: "09:00", end: "17:00" },
  fri: { enabled: true, start: "09:00", end: "17:00" },
  sat: { enabled: false, start: "09:00", end: "17:00" },
  sun: { enabled: false, start: "09:00", end: "17:00" },
};

// A booking link can exist before she's ever opened Settings > Scheduling
// (the row that lazily creates scheduling_settings) - falls back to the
// same defaults that row would get, so the public page always works.
function withDefaults(row: SchedulingSettings | null) {
  return {
    durationMinutes: row?.duration_minutes ?? 30,
    daysOut: row?.days_out ?? 14,
    visibleSlotPct: row?.visible_slot_pct ?? 100,
    weeklyHours: row?.weekly_hours ?? DEFAULT_WEEKLY_HOURS,
  };
}

export type BookingPageData = {
  durationMinutes: number;
  prefill: { name: string; phone: string; email: string } | null;
  slots: Slot[];
};

export async function getBookingPageData(slug: string): Promise<BookingPageData | null> {
  if (!OWNER_ID || !SLUG_FORMAT.test(slug)) return null;
  const admin = createAdminClient();

  const { data: link } = await admin.from("booking_links").select("id, contact_id").eq("owner_id", OWNER_ID).eq("slug", slug).maybeSingle();
  if (!link) return null;

  const { data: settingsRow } = await admin.from("scheduling_settings").select("*").eq("owner_id", OWNER_ID).maybeSingle();
  const settings = withDefaults(settingsRow as SchedulingSettings | null);

  let prefill: BookingPageData["prefill"] = null;
  if (link.contact_id) {
    const { data: contact } = await admin.from("contacts").select("first_name, last_name, phone, email").eq("id", link.contact_id).maybeSingle();
    if (contact) {
      prefill = {
        name: `${contact.first_name} ${contact.last_name}`.trim(),
        phone: contact.phone ?? "",
        email: contact.email ?? "",
      };
    }
  }

  const slots = await computeAvailableSlots(admin, OWNER_ID, settings);
  return { durationMinutes: settings.durationMinutes, prefill, slots };
}

export async function requestBooking(
  slug: string,
  input: { name: string; phone: string; email: string; startsAt: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!OWNER_ID || !SLUG_FORMAT.test(slug)) return { ok: false, error: "This link isn't valid." };
  if (!input.name.trim() || !input.phone.trim() || !input.startsAt) {
    return { ok: false, error: "Name, phone, and a time are all required." };
  }

  const admin = createAdminClient();
  const { data: link } = await admin.from("booking_links").select("id, contact_id").eq("owner_id", OWNER_ID).eq("slug", slug).maybeSingle();
  if (!link) return { ok: false, error: "This link isn't valid." };

  const { data: settingsRow } = await admin.from("scheduling_settings").select("*").eq("owner_id", OWNER_ID).maybeSingle();
  const settings = withDefaults(settingsRow as SchedulingSettings | null);

  // Re-verify against a fresh computation rather than trusting the slot
  // the browser last saw - guards both a real race (someone else grabbed
  // it a second ago) and a guessed/replayed time that was never actually
  // shown (including one hidden by the "looks busier" filter).
  const slots = await computeAvailableSlots(admin, OWNER_ID, settings);
  const slot = slots.find((s) => s.startAt === input.startsAt);
  if (!slot) return { ok: false, error: "That time isn't available anymore - pick another." };

  let contactId = link.contact_id;
  if (!contactId) {
    const nameParts = input.name.trim().split(/\s+/);
    const contact = await findOrCreateContact(admin, OWNER_ID, {
      email: input.email.trim() || null,
      phone: input.phone.trim(),
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(" ") || null,
      leadSource: "Scheduling page",
    });
    contactId = contact?.id ?? null;
  }

  const { error } = await admin.from("booking_requests").insert({
    owner_id: OWNER_ID,
    booking_link_id: link.id,
    contact_id: contactId,
    visitor_name: input.name.trim(),
    visitor_phone: input.phone.trim(),
    visitor_email: input.email.trim() || null,
    starts_at: slot.startAt,
    ends_at: slot.endAt,
  });
  if (error) return { ok: false, error: "Couldn't save that request - try again." };

  await notifyNewLead(admin, OWNER_ID, {
    title: input.name.trim(),
    body: `Requested ${new Date(slot.startAt).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} - review it`,
    url: "/scheduling",
  });

  return { ok: true };
}
