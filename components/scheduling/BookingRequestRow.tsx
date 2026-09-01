"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { approveBooking, declineBooking } from "@/app/(app)/scheduling/actions";
import { APP_TIMEZONE } from "@/lib/format-time";
import type { BookingRequestWithContact } from "@/lib/data/scheduling";

export function BookingRequestRow({ request }: { request: BookingRequestWithContact }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "decline" | null>(null);
  const [error, setError] = useState("");

  async function approve() {
    setBusy("approve");
    setError("");
    const res = await approveBooking(request.id);
    setBusy(null);
    if (res.ok) router.refresh();
    else setError(res.error);
  }

  async function decline() {
    setBusy("decline");
    setError("");
    const res = await declineBooking(request.id);
    setBusy(null);
    if (res.ok) router.refresh();
    else setError(res.error);
  }

  return (
    <div className="flex items-center gap-3.5 border-b border-neutral-100 px-4 py-3.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold leading-6 text-neutral-900">
          {request.contact_id ? (
            <Link href={`/contacts/${request.contact_id}`} className="hover:underline">
              {request.contact_name || request.visitor_name}
            </Link>
          ) : (
            request.visitor_name
          )}
        </p>
        <p className="mt-0.5 truncate text-sm text-neutral-500">
          {formatInTimeZone(request.starts_at, APP_TIMEZONE, "EEE, MMM d 'at' h:mm a")} · {request.visitor_phone}
        </p>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={decline}
          disabled={busy !== null}
          className="rounded-[10px] border border-neutral-200 bg-white px-3.5 py-2 text-sm font-semibold text-neutral-800 disabled:opacity-50"
        >
          {busy === "decline" ? "…" : "Decline"}
        </button>
        <button
          type="button"
          onClick={approve}
          disabled={busy !== null}
          className="rounded-[10px] bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy === "approve" ? "…" : "Approve"}
        </button>
      </div>
    </div>
  );
}
