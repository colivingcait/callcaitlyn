"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateListingStatus } from "@/app/(app)/listings/actions";
import { LISTING_STATUSES, STATUS_LABEL } from "@/lib/listings/status";
import type { ListingStatus } from "@/types/database";

// Four-status select. Moving to Under contract still prompts for the
// commission tracker (README §8: "a prompt, not automatic") — the select
// itself is not automatic.
export function ListingStatusMenu({ listingId, status }: { listingId: string; status: ListingStatus }) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [prompt, setPrompt] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleChange(next: ListingStatus) {
    if (next === current) return;
    setSaving(true);
    const result = await updateListingStatus(listingId, next);
    setSaving(false);
    if (!result.ok) return;
    setCurrent(next);
    if (next === "under_contract") setPrompt(true);
    router.refresh();
  }

  return (
    <div className="relative">
      <label className="sr-only" htmlFor={`listing-status-${listingId}`}>
        Listing status
      </label>
      <select
        id={`listing-status-${listingId}`}
        value={current}
        disabled={saving}
        onChange={(e) => handleChange(e.target.value as ListingStatus)}
        className="rounded-full border border-[#eadfd6] bg-white px-3 py-1.5 text-[13px] font-medium text-neutral-700 disabled:opacity-50"
      >
        {LISTING_STATUSES.map((value) => (
          <option key={value} value={value}>
            {STATUS_LABEL[value]}
          </option>
        ))}
      </select>
      {prompt && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={() => setPrompt(false)}>
          <div className="w-full rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-sm sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="font-serif text-lg font-semibold text-neutral-900">Add this to your commission tracker?</p>
            <p className="mt-1.5 text-sm text-neutral-600">
              Opens Commissions, where you can add it as a deal with this address and price — pick buyer or seller side there.
            </p>
            <div className="mt-4 flex gap-3">
              <Link href="/commissions" className="flex-1 rounded-xl bg-neutral-900 px-4 py-2.5 text-center text-sm font-semibold text-white">
                Open Commissions
              </Link>
              <button
                type="button"
                onClick={() => setPrompt(false)}
                className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
