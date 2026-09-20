"use client";

import Link from "next/link";
import { Megaphone, MessageCircleMore, X } from "lucide-react";
import { campaignsBlastHref } from "@/lib/crm/events-sot";

export function MessageRegistrantsModal({
  eventKey,
  eventLabel,
  contactIds,
  audience,
  onClose,
}: {
  eventKey: string;
  eventLabel: string;
  contactIds: string[];
  audience?: string | null;
  onClose: () => void;
}) {
  const count = contactIds.length;
  const textNextHref = `/events/${encodeURIComponent(eventKey)}?textNext=1${audience ? `&audience=${encodeURIComponent(audience)}` : ""}`;
  const campaignsHref = campaignsBlastHref(contactIds);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="message-registrants-title">
      <button type="button" aria-label="Close" className="absolute inset-0 cursor-default" onClick={onClose} />
      <div className="relative w-full max-w-[560px] rounded-[28px] bg-white px-8 py-10 shadow-xl">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100">
          <X size={18} />
        </button>
        <h2 id="message-registrants-title" className="text-center font-display text-[32px] font-semibold tracking-[-0.03em] text-neutral-900">
          Message registrants
        </h2>
        <p className="mt-1 text-center text-[15px] text-neutral-500">
          {count} {count === 1 ? "person" : "people"} on this roster
          {eventLabel ? ` · ${eventLabel}` : ""}
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[20px] border border-[#eadfd6] bg-[#fffdfb] px-5 py-6 text-center">
            <MessageCircleMore size={28} strokeWidth={1.6} className="mx-auto text-[#c45c4a]" />
            <p className="mt-4 font-display text-[22px] font-semibold text-neutral-900">Text &amp; Next</p>
            <p className="mt-2 text-[14px] leading-5 text-neutral-500">Go one-by-one. Edit each message before you send.</p>
            <Link
              href={textNextHref}
              className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-[#c45c4a] px-5 text-[14px] font-semibold text-white"
            >
              Start Text &amp; Next
            </Link>
          </div>
          <div className="rounded-[20px] border border-[#eadfd6] bg-[#fffdfb] px-5 py-6 text-center">
            <Megaphone size={28} strokeWidth={1.6} className="mx-auto text-[#c45c4a]" />
            <p className="mt-4 font-display text-[22px] font-semibold text-neutral-900">Message all</p>
            <p className="mt-2 text-[14px] leading-5 text-neutral-500">Same blast to everyone. Opens Campaigns with this roster loaded.</p>
            <Link
              href={campaignsHref}
              className="mt-5 inline-flex h-10 items-center justify-center rounded-full border border-[#eadfd6] bg-white px-5 text-[14px] font-semibold text-neutral-800"
            >
              Open in Campaigns
            </Link>
          </div>
        </div>
        <div className="mt-6 text-center">
          <button type="button" onClick={onClose} className="text-[15px] font-medium text-neutral-500 hover:text-neutral-800">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
