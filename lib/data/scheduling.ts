import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import type { SchedulingSettings, BookingRequest, WeeklyHours } from "@/types/database";

const DEFAULT_WEEKLY_HOURS: WeeklyHours = {
  mon: { enabled: true, start: "09:00", end: "17:00" },
  tue: { enabled: true, start: "09:00", end: "17:00" },
  wed: { enabled: true, start: "09:00", end: "17:00" },
  thu: { enabled: true, start: "09:00", end: "17:00" },
  fri: { enabled: true, start: "09:00", end: "17:00" },
  sat: { enabled: false, start: "09:00", end: "17:00" },
  sun: { enabled: false, start: "09:00", end: "17:00" },
};

// Lazily creates the settings row on first read rather than requiring a
// separate "set up scheduling" step - every owner gets sane defaults
// immediately, and Settings just edits them in place from here on.
export async function getSchedulingSettings(): Promise<SchedulingSettings | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing } = await supabase.from("scheduling_settings").select("*").eq("owner_id", user.id).maybeSingle();
  if (existing) return existing as SchedulingSettings;

  const { data: created } = await supabase
    .from("scheduling_settings")
    .insert({ owner_id: user.id, weekly_hours: DEFAULT_WEEKLY_HOURS })
    .select("*")
    .maybeSingle();
  return (created as SchedulingSettings) ?? null;
}

function generateSlug(): string {
  return randomBytes(6).toString("base64url");
}

// One reusable "put this anywhere" link per owner (contact_id null) -
// created once, returned again on every later call instead of minting a
// new one each time, unlike quotes' always-fresh-slug approach (a
// scheduling link isn't a snapshot of anything that can go stale, so
// there's no reason for it to ever change).
export async function getOrCreateGenericBookingLink(): Promise<{ slug: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing } = await supabase
    .from("booking_links")
    .select("slug")
    .eq("owner_id", user.id)
    .is("contact_id", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing) return { slug: existing.slug as string };

  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = generateSlug();
    const { data, error } = await supabase.from("booking_links").insert({ owner_id: user.id, slug }).select("slug").maybeSingle();
    if (!error && data) return { slug: data.slug as string };
    if (error && error.code !== "23505") return null;
  }
  return null;
}

export type BookingRequestWithContact = BookingRequest & { contact_name: string | null };

export async function listPendingBookingRequests(): Promise<BookingRequestWithContact[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("booking_requests")
    .select("*, contacts(first_name, last_name)")
    .eq("status", "pending")
    .order("starts_at", { ascending: true });

  return (data ?? []).map((row) => {
    const { contacts, ...rest } = row as BookingRequest & { contacts: { first_name: string; last_name: string } | null };
    return { ...rest, contact_name: contacts ? `${contacts.first_name} ${contacts.last_name}`.trim() : null };
  });
}

export async function listUpcomingApprovedBookingRequests(): Promise<BookingRequestWithContact[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("booking_requests")
    .select("*, contacts(first_name, last_name)")
    .eq("status", "approved")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(20);

  return (data ?? []).map((row) => {
    const { contacts, ...rest } = row as BookingRequest & { contacts: { first_name: string; last_name: string } | null };
    return { ...rest, contact_name: contacts ? `${contacts.first_name} ${contacts.last_name}`.trim() : null };
  });
}
