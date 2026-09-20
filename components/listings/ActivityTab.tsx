"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Phone, Send, Tag, Unlock, FileSignature, CircleCheck, UserPlus } from "lucide-react";
import { openQuoCall } from "@/lib/quo/call-link";
import { promoteAgentToContact } from "@/app/(app)/listings/actions";
import { formatLocal } from "@/lib/format-time";
import { buildAgentRail, buildListingTimeline, type ListingAgentTouch, type ListingPageLeadEvent, type ListingStatusChange, type ListingTimelineEvent } from "@/lib/crm/listing-activity";
import type { ListingPriceChange, ListingSend } from "@/types/database";

const TIMELINE_ICON: Record<ListingTimelineEvent["kind"], React.ElementType> = {
  status: ArrowRightLeft,
  price: Tag,
  rp_blast: Send,
  inbound_agent: Phone,
  investor_unlock: Unlock,
  offer: FileSignature,
  created: ArrowRightLeft,
};

function TimelineRow({ event }: { event: ListingTimelineEvent }) {
  const Icon = TIMELINE_ICON[event.kind];
  return (
    <div className="flex items-start gap-3 border-b border-[#eadfd6] px-4 py-3.5 last:border-b-0">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f7f1ea] text-brand-700">
        <Icon size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-neutral-900">{event.title}</p>
        {event.detail && <p className="mt-0.5 text-sm text-neutral-500">{event.detail}</p>}
        {event.href && (
          <Link href={event.href} className="mt-1 inline-block text-sm font-semibold text-brand-700 hover:underline">
            {event.hrefLabel ?? "View audience"}
          </Link>
        )}
        {event.kind === "inbound_agent" && event.callBackPhone && (
          <button
            type="button"
            onClick={() => openQuoCall(event.callBackPhone!)}
            className="mt-2 inline-flex items-center gap-1.5 rounded-[10px] border border-[#eadfd6] bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800"
          >
            <Phone size={14} className="text-brand-600" /> Call back
          </button>
        )}
      </div>
      <time className="shrink-0 text-sm text-neutral-400">{formatLocal(event.when, "MMM d, h:mm a")}</time>
    </div>
  );
}

function AgentRailRow({
  row,
  listingId,
  onChanged,
}: {
  row: ReturnType<typeof buildAgentRail>[number];
  listingId: string;
  onChanged: () => void;
}) {
  const [promoting, setPromoting] = useState(false);
  const [promoted, setPromoted] = useState(row.alreadyPartner);
  const [error, setError] = useState("");

  async function promote() {
    setPromoting(true);
    setError("");
    const result = await promoteAgentToContact({
      listingId,
      name: row.name,
      brokerage: row.brokerage,
      email: row.email,
      phone: row.phone,
    });
    setPromoting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPromoted(true);
    onChanged();
  }

  return (
    <div className="border-b border-[#eadfd6] px-4 py-3.5 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-neutral-900">{row.name}</p>
          <p className="mt-0.5 text-sm text-neutral-500">
            {[row.brokerage, row.lastChannel].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#f7f1ea] px-2.5 py-0.5 text-xs font-semibold text-brand-700">{row.lastChannel}</span>
      </div>
      <div className="mt-2.5">
        {promoted ? (
          <p className="flex items-center gap-1.5 text-sm text-emerald-700">
            <CircleCheck size={14} /> Referral partner
          </p>
        ) : (
          <button
            type="button"
            onClick={promote}
            disabled={promoting}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <UserPlus size={13} /> {promoting ? "Adding…" : "Add as Referral Partner"}
          </button>
        )}
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}

export function ActivityTab({
  listingId,
  listingCreatedAt,
  statusChanges,
  priceChanges,
  sends,
  messages,
  pageEvents,
}: {
  listingId: string;
  listingCreatedAt: string;
  statusChanges: ListingStatusChange[];
  priceChanges: ListingPriceChange[];
  sends: ListingSend[];
  messages: ListingAgentTouch[];
  pageEvents: ListingPageLeadEvent[];
}) {
  const router = useRouter();
  const timeline = buildListingTimeline({
    listingId,
    listingCreatedAt,
    statusChanges,
    priceChanges,
    sends,
    messages,
    pageEvents,
  });
  const railRows = buildAgentRail(messages);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.85fr)] lg:items-start lg:gap-6">
      <section className="rounded-2xl border border-[#eadfd6] bg-white">
        <div className="border-b border-[#eadfd6] px-4 py-4">
          <h2 className="text-base font-semibold text-neutral-900">Timeline</h2>
          <p className="mt-0.5 text-sm text-neutral-500">Newest first · status, price, RP, inbound, unlocks, offers</p>
        </div>
        {timeline.length === 0 ? (
          <p className="px-4 py-8 text-[15px] text-neutral-400">Nothing recorded yet.</p>
        ) : (
          timeline.map((event) => <TimelineRow key={event.key} event={event} />)
        )}
      </section>

      <aside className="rounded-2xl border border-[#eadfd6] bg-white lg:sticky lg:top-6">
        <div className="border-b border-[#eadfd6] px-4 py-4">
          <h2 className="text-base font-semibold text-neutral-900">Agent activity</h2>
          <p className="mt-0.5 text-sm text-neutral-500">Not a contact until you add them as a referral partner.</p>
        </div>
        {railRows.length === 0 ? (
          <p className="px-4 py-8 text-[15px] text-neutral-400">No agent calls or texts yet.</p>
        ) : (
          railRows.map((row) => <AgentRailRow key={row.key} row={row} listingId={listingId} onChanged={() => router.refresh()} />)
        )}
      </aside>
    </div>
  );
}
