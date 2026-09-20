"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Phone, CircleCheck } from "lucide-react";
import { openQuoCall } from "@/lib/quo/call-link";
import { promoteAgentToContact } from "@/app/(app)/listings/actions";
import { formatLocal } from "@/lib/format-time";
import {
  buildAgentRail,
  buildListingTimeline,
  timelineWhenLabel,
  type ListingAgentTouch,
  type ListingPageLeadEvent,
  type ListingStatusChange,
  type ListingTimelineEvent,
} from "@/lib/crm/listing-activity";
import type { ListingPriceChange, ListingSend } from "@/types/database";

function TimelineRow({ event, last }: { event: ListingTimelineEvent; last: boolean }) {
  const when = timelineWhenLabel(event.when);
  const inboundMeta = [event.detail, formatLocal(event.when, "h:mm a")].filter(Boolean).join(" · ");

  return (
    <li className="relative flex gap-4 pb-8 last:pb-0">
      {!last && <span className="absolute left-[5px] top-3 bottom-0 w-px bg-[#e7ddd4]" />}
      <span className="relative z-10 mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-[#c9b8aa] bg-white" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold leading-5 text-neutral-900">{event.title}</p>
            {event.kind === "inbound_agent" ? (
              inboundMeta && <p className="mt-1 text-[13px] leading-5 text-neutral-500">{inboundMeta}</p>
            ) : (
              <>
                {event.detail && <p className="mt-1 text-[13px] leading-5 text-neutral-500">{event.detail}</p>}
                {event.href && (
                  <Link href={event.href} className="mt-1 inline-block text-[13px] font-medium text-brand-600 underline-offset-2 hover:underline">
                    {event.hrefLabel ?? "View Agents"}
                  </Link>
                )}
                <p className="mt-1 text-[13px] leading-5 text-neutral-400">{when}</p>
              </>
            )}
          </div>
          {event.kind === "inbound_agent" && event.callBackPhone && (
            <button
              type="button"
              onClick={() => openQuoCall(event.callBackPhone!)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#eadfd6] bg-white px-3 py-1.5 text-[13px] font-medium text-neutral-700"
            >
              <Phone size={13} className="text-neutral-400" /> Call back
            </button>
          )}
        </div>
      </div>
    </li>
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
    <div className="border-b border-[#f0e7df] py-4 last:border-b-0 last:pb-0 first:pt-0">
      <div className="flex items-start justify-between gap-4">
        <p className="text-[15px] font-semibold text-neutral-900">{row.name}</p>
        <p className="text-right text-[13px] text-neutral-500">{row.brokerage ?? "—"}</p>
      </div>
      <p className="mt-0.5 text-right text-[13px] text-neutral-400">Last: {row.lastChannel}</p>
      <div className="mt-3">
        {promoted ? (
          <p className="flex items-center justify-center gap-1.5 rounded-lg bg-[#f3ece6] py-2.5 text-[13px] font-semibold text-emerald-700">
            <CircleCheck size={14} /> Referral partner
          </p>
        ) : (
          <button
            type="button"
            onClick={promote}
            disabled={promoting}
            className="w-full rounded-lg bg-brand-600 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            {promoting ? "Adding…" : "Add as Referral Partner"}
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
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)] lg:gap-16">
      <section>
        {timeline.length === 0 ? (
          <p className="text-[15px] text-neutral-400">Nothing recorded yet.</p>
        ) : (
          <ol>
            {timeline.map((event, index) => (
              <TimelineRow key={event.key} event={event} last={index === timeline.length - 1} />
            ))}
          </ol>
        )}
      </section>

      <aside className="rounded-2xl bg-white px-6 py-5 shadow-card">
        <h2 className="text-[17px] font-semibold text-neutral-900">Agent activity</h2>
        <div className="mt-4">
          {railRows.length === 0 ? (
            <p className="py-6 text-[15px] text-neutral-400">No agent calls or texts yet.</p>
          ) : (
            railRows.map((row) => <AgentRailRow key={row.key} row={row} listingId={listingId} onChanged={() => router.refresh()} />)
          )}
        </div>
      </aside>
    </div>
  );
}
