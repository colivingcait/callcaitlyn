"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { CalendarClock, Check } from "lucide-react";
import { getBookingPageData, requestBooking, type BookingPageData } from "./actions";
import { APP_TIMEZONE } from "@/lib/format-time";

export default function PublicBookingPage() {
  const params = useParams<{ slug: string }>();

  const [data, setData] = useState<BookingPageData | null | "loading">("loading");
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getBookingPageData(params.slug).then((result) => {
      if (cancelled) return;
      setData(result);
      if (result?.prefill) {
        setName(result.prefill.name);
        setPhone(result.prefill.phone);
        setEmail(result.prefill.email);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [params.slug]);

  async function submit() {
    if (!selected || !name.trim() || !phone.trim()) return;
    setSubmitting(true);
    setError("");
    const result = await requestBooking(params.slug, { name: name.trim(), phone: phone.trim(), email: email.trim(), startsAt: selected });
    setSubmitting(false);
    if (result.ok) setDone(true);
    else setError(result.error);
  }

  if (data === "loading") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-neutral-50">
        <p className="text-neutral-400">Loading…</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-neutral-50 px-4 text-center">
        <p className="text-neutral-500">This link isn&apos;t valid anymore. Ask Caitlyn to send a fresh one.</p>
      </main>
    );
  }

  if (done) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-brand-50 via-white to-white px-4">
        <div className="mx-auto max-w-sm rounded-3xl border border-neutral-200/70 bg-white p-7 text-center shadow-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Check size={22} />
          </div>
          <p className="mt-4 font-serif text-xl font-semibold text-neutral-900">Request sent!</p>
          <p className="mt-1.5 text-[15px] leading-6 text-neutral-500">
            Caitlyn will confirm shortly and text you at {phone} once it&apos;s booked.
          </p>
        </div>
      </main>
    );
  }

  const groups = new Map<string, { startAt: string; endAt: string }[]>();
  for (const slot of data.slots) {
    const key = formatInTimeZone(slot.startAt, APP_TIMEZONE, "yyyy-MM-dd");
    groups.set(key, [...(groups.get(key) ?? []), slot]);
  }
  const dayKeys = [...groups.keys()].sort();

  return (
    <main className="min-h-dvh bg-gradient-to-b from-brand-50 via-white to-white px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center gap-2.5">
          <CalendarClock size={20} className="shrink-0 text-neutral-500" />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-neutral-900">Book time with Caitlyn</p>
            <p className="truncate text-sm text-neutral-500">{data.durationMinutes} minutes</p>
          </div>
        </div>

        <div className="rounded-3xl border border-neutral-200/70 bg-white p-6 shadow-xl">
          {dayKeys.length === 0 ? (
            <p className="py-6 text-center text-[15px] text-neutral-500">Nothing open right now — check back soon or text Caitlyn directly.</p>
          ) : (
            <div className="space-y-4">
              {dayKeys.map((key) => (
                <div key={key}>
                  <p className="mb-2 text-sm font-semibold text-neutral-700">{formatInTimeZone(`${key}T12:00:00`, APP_TIMEZONE, "EEEE, MMM d")}</p>
                  <div className="flex flex-wrap gap-2">
                    {groups.get(key)!.map((slot) => (
                      <button
                        key={slot.startAt}
                        type="button"
                        onClick={() => setSelected(slot.startAt)}
                        className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                          selected === slot.startAt
                            ? "border-brand-600 bg-brand-600 text-white"
                            : "border-neutral-200 text-neutral-700 hover:border-neutral-300"
                        }`}
                      >
                        {formatInTimeZone(slot.startAt, APP_TIMEZONE, "h:mm a")}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {selected && (
            <div className="mt-5 border-t border-neutral-100 pt-5">
              <p className="text-[15px] font-semibold text-neutral-900">
                {formatInTimeZone(selected, APP_TIMEZONE, "EEEE, MMM d 'at' h:mm a")}
              </p>
              <div className="mt-3 space-y-3">
                <div>
                  <label className="text-xs font-medium text-neutral-500">Your name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="mt-1 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-[15px] text-neutral-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500">Phone</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    type="tel"
                    placeholder="(555) 555-1234"
                    className="mt-1 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-[15px] text-neutral-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500">Email (optional)</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    className="mt-1 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-[15px] text-neutral-900"
                  />
                </div>
              </div>

              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

              <button
                type="button"
                onClick={submit}
                disabled={submitting || !name.trim() || !phone.trim()}
                className="mt-4 w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submitting ? "Sending…" : "Request this time"}
              </button>
              <p className="mt-2 text-center text-xs text-neutral-400">Caitlyn confirms every request before it&apos;s final.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
