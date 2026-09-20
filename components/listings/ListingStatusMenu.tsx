"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { updateListingStatus } from "@/app/(app)/listings/actions";
import { STATUS_LABEL, nextListingStatus } from "@/lib/listings/status";
import type { ListingStatus } from "@/types/database";

// "Mark {next status}" - a prompt, not automatic, for the one status move
// (Active -> Under contract) worth pausing on: it's what should get this
// listing into the commission tracker (README §8: "a prompt, not
// automatic"). AddPastDealModal always writes a *closed* deal, which is
// the wrong shape for a deal that just went under contract, so this
// links to Commissions rather than mis-using that modal.
export function ListingStatusMenu({ listingId, status }: { listingId: string; status: ListingStatus }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState(false);
  const [saving, setSaving] = useState(false);
  const next = nextListingStatus(status);
  if (!next) return null;

  async function markNext() {
    if (!next) return;
    setSaving(true);
    const result = await updateListingStatus(listingId, next);
    setSaving(false);
    setOpen(false);
    if (result.ok) {
      if (next === "under_contract") setPrompt(true);
      router.refresh();
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        className="flex items-center gap-1.5 rounded-full border border-[#eadfd6] bg-white px-3 py-1.5 text-[13px] font-medium text-neutral-700 disabled:opacity-50"
      >
        Mark next status <ChevronDown size={13} className="text-neutral-400" />
      </button>
      {open && (
        <>
          <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="fixed inset-0 z-30 cursor-default" />
          <div className="absolute right-0 top-full z-40 mt-1 w-56 rounded-xl border border-neutral-200 bg-white p-1 shadow-lg">
            <button type="button" onClick={markNext} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50">
              Confirm: mark {STATUS_LABEL[next].toLowerCase()}
            </button>
          </div>
        </>
      )}
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
