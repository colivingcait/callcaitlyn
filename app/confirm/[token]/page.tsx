"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { Check, CalendarClock } from "lucide-react";
import { getProposedTime, confirmProposedTime, type ProposedTimeView } from "./actions";
import { APP_TIMEZONE } from "@/lib/format-time";

export default function ConfirmProposedTimePage() {
  const params = useParams<{ token: string }>();
  const [view, setView] = useState<ProposedTimeView | null | "loading">("loading");
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getProposedTime(params.token).then((result) => {
      if (!cancelled) setView(result);
    });
    return () => {
      cancelled = true;
    };
  }, [params.token]);

  async function confirm() {
    setConfirming(true);
    setError("");
    const result = await confirmProposedTime(params.token);
    setConfirming(false);
    if (result.ok) setConfirmed(true);
    else setError(result.error);
  }

  if (view === "loading") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-neutral-50">
        <p className="text-neutral-400">Loading…</p>
      </main>
    );
  }

  if (!view) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-neutral-50 px-4 text-center">
        <p className="text-neutral-500">This link isn&apos;t active anymore. Text Caitlyn back if you still need to find a time.</p>
      </main>
    );
  }

  const when = formatInTimeZone(view.proposedStartsAt, APP_TIMEZONE, "EEEE, MMM d 'at' h:mm a");

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-brand-50 via-white to-white px-4">
      <div className="mx-auto w-full max-w-sm rounded-3xl border border-neutral-200/70 bg-white p-7 text-center shadow-xl">
        {confirmed ? (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Check size={22} />
            </div>
            <p className="mt-4 font-serif text-xl font-semibold text-neutral-900">You&apos;re booked!</p>
            <p className="mt-1.5 text-[15px] leading-6 text-neutral-500">
              {when} — a calendar invite is on its way to you. See you then!
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <CalendarClock size={22} />
            </div>
            <p className="mt-4 font-serif text-xl font-semibold text-neutral-900">Confirm this time?</p>
            <p className="mt-1.5 text-[15px] leading-6 text-neutral-500">{when}</p>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <button
              type="button"
              onClick={confirm}
              disabled={confirming}
              className="mt-5 w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {confirming ? "Confirming…" : "Yes, that works"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
