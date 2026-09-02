"use client";

import { useEffect, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { CalendarClock, Check, LayoutGrid, List } from "lucide-react";
import { getBookingFlowData, startBookingSession, selectBookingSlot, submitBookingDetails, type BookingFlowData } from "@/app/book/booking-actions";
import { CalendarGridView } from "@/components/booking/CalendarGridView";
import { ListView } from "@/components/booking/ListView";
import { BOOKING_CONTACT_TYPE_OPTIONS } from "@/lib/crm/booking-form-options";
import { TIMELINE_LABELS } from "@/lib/utils";
import { APP_TIMEZONE } from "@/lib/format-time";
import type { BookingContactType, Timeline } from "@/types/database";

type Step = "info" | "time" | "details" | "done";
const STEP_NUMBER: Record<Step, number> = { info: 1, time: 2, details: 3, done: 3 };

const inputClass = "mt-1 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-[15px] text-neutral-900";

export function BookingFlow({ slug }: { slug: string | null }) {
  const [data, setData] = useState<BookingFlowData | null | "loading">("loading");
  const [step, setStep] = useState<Step>("info");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [view, setView] = useState<"calendar" | "list">("calendar");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [contactType, setContactType] = useState<BookingContactType | "">("");
  const [timeline, setTimeline] = useState<Timeline | "">("");
  const [notes, setNotes] = useState("");
  const [questions, setQuestions] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getBookingFlowData(slug).then((result) => {
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
  }, [slug]);

  async function submitInfo() {
    if (!name.trim() || !phone.trim()) return;
    setSubmitting(true);
    setError("");
    const result = await startBookingSession({ slug, name: name.trim(), phone: phone.trim(), email: email.trim() });
    setSubmitting(false);
    if (result.ok) {
      setSessionId(result.sessionId);
      setStep("time");
    } else {
      setError(result.error);
    }
  }

  async function submitTime() {
    if (!sessionId || !selectedSlot) return;
    setSubmitting(true);
    setError("");
    const result = await selectBookingSlot(sessionId, selectedSlot);
    setSubmitting(false);
    if (result.ok) setStep("details");
    else setError(result.error);
  }

  async function submitDetails() {
    if (!sessionId) return;
    setSubmitting(true);
    setError("");
    const result = await submitBookingDetails(sessionId, {
      contactType: contactType || null,
      timeline: timeline || null,
      notes,
      questions,
    });
    setSubmitting(false);
    if (result.ok) setStep("done");
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

  if (step === "done") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-brand-50 via-white to-white px-4">
        <div className="mx-auto max-w-sm rounded-3xl border border-neutral-200/70 bg-white p-7 text-center shadow-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Check size={22} />
          </div>
          <p className="mt-4 font-serif text-xl font-semibold text-neutral-900">Request sent!</p>
          <p className="mt-1.5 text-[15px] leading-6 text-neutral-500">
            {selectedSlot && (
              <>
                {formatInTimeZone(selectedSlot, APP_TIMEZONE, "EEEE, MMM d 'at' h:mm a")} — Caitlyn will confirm shortly and text you at {phone}.
              </>
            )}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-gradient-to-b from-brand-50 via-white to-white px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center gap-2.5">
          <CalendarClock size={20} className="shrink-0 text-neutral-500" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold text-neutral-900">Book time with Caitlyn</p>
            <p className="truncate text-sm text-neutral-500">{data.durationMinutes} minutes</p>
          </div>
          <span className="shrink-0 text-xs font-medium text-neutral-400">Step {STEP_NUMBER[step]} of 3</span>
        </div>

        <div className="rounded-3xl border border-neutral-200/70 bg-white p-6 shadow-xl">
          {step === "info" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-neutral-500">Your name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500">Phone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="(555) 555-1234" className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500">Email (optional)</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className={inputClass} />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="button"
                onClick={submitInfo}
                disabled={submitting || !name.trim() || !phone.trim()}
                className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submitting ? "…" : "Next"}
              </button>
            </div>
          )}

          {step === "time" && (
            <div>
              <div className="mb-4 flex items-center justify-end gap-1 rounded-lg bg-neutral-100 p-1 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setView("calendar")}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 ${view === "calendar" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"}`}
                >
                  <LayoutGrid size={13} /> Calendar
                </button>
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 ${view === "list" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"}`}
                >
                  <List size={13} /> List
                </button>
              </div>

              {view === "calendar" ? (
                <CalendarGridView slots={data.slots} selected={selectedSlot} onSelect={setSelectedSlot} />
              ) : (
                <ListView slots={data.slots} selected={selectedSlot} onSelect={setSelectedSlot} />
              )}

              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

              <div className="mt-5 flex gap-2 border-t border-neutral-100 pt-5">
                <button type="button" onClick={() => setStep("info")} className="rounded-xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-700">
                  Back
                </button>
                <button
                  type="button"
                  onClick={submitTime}
                  disabled={submitting || !selectedSlot}
                  className="flex-1 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {submitting ? "…" : "Next"}
                </button>
              </div>
            </div>
          )}

          {step === "details" && (
            <div className="space-y-3">
              {selectedSlot && (
                <p className="text-[15px] font-semibold text-neutral-900">{formatInTimeZone(selectedSlot, APP_TIMEZONE, "EEEE, MMM d 'at' h:mm a")}</p>
              )}
              <div>
                <label className="text-xs font-medium text-neutral-500">What best describes you? (optional)</label>
                <select value={contactType} onChange={(e) => setContactType(e.target.value as BookingContactType | "")} className={inputClass}>
                  <option value="">Prefer not to say</option>
                  {BOOKING_CONTACT_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500">Timeline (optional)</label>
                <select value={timeline} onChange={(e) => setTimeline(e.target.value as Timeline | "")} className={inputClass}>
                  <option value="">Not sure yet</option>
                  {Object.entries(TIMELINE_LABELS)
                    .filter(([value]) => value !== "unknown")
                    .map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500">Anything else worth knowing? (optional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500">Specific questions for the meeting? (optional)</label>
                <textarea value={questions} onChange={(e) => setQuestions(e.target.value)} rows={2} className={inputClass} />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setStep("time")} className="rounded-xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-700">
                  Back
                </button>
                <button
                  type="button"
                  onClick={submitDetails}
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {submitting ? "Sending…" : "Request this time"}
                </button>
              </div>
              <p className="text-center text-xs text-neutral-400">Caitlyn confirms every request before it&apos;s final.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
