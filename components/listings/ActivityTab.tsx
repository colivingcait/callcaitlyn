"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, PhoneIncoming, MessageSquareText, MessageSquare, UserPlus, Tag, Send, UploadCloud, CircleCheck } from "lucide-react";
import { openQuoCall } from "@/lib/quo/call-link";
import { replyToAgent, promoteAgentToContact } from "@/app/(app)/listings/actions";
import { formatCurrency } from "@/lib/utils";
import { formatLocal, relativeTime } from "@/lib/format-time";
import type { ListingAgentMessage, ListingPriceChange, ListingSend } from "@/types/database";

type TimelineEntry = { key: string; icon: React.ElementType; label: string; detail: string; when: string };

function buildTimeline(priceChanges: ListingPriceChange[], sends: ListingSend[], listingCreatedAt: string): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  for (const p of priceChanges) {
    entries.push({
      key: `price:${p.id}`,
      icon: Tag,
      label: `Price changed · ${formatCurrency(p.old_price)} → ${formatCurrency(p.new_price)}`,
      detail: "",
      when: p.occurred_at,
    });
  }
  for (const s of sends) {
    entries.push({
      key: `send:${s.id}`,
      icon: Send,
      label: `${s.channel === "email" ? "Email" : "Text"} · ${s.subject || s.message.slice(0, 40)}`,
      detail: s.status === "canceled" ? "Canceled" : s.status === "sending" ? "Sending" : "Sent",
      when: s.created_at,
    });
  }
  entries.push({ key: "created", icon: UploadCloud, label: "Listing created", detail: "", when: listingCreatedAt });
  return entries.sort((a, b) => b.when.localeCompare(a.when));
}

function MessageRow({
  m,
  onReplied,
}: {
  m: ListingAgentMessage & { name: string; brokerage: string | null; phone: string | null; email: string | null };
  onReplied: () => void;
}) {
  const [replying, setReplying] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [promoting, setPromoting] = useState(false);
  const [promoted, setPromoted] = useState(false);

  const needsReply = m.direction === "inbound" && m.channel === "text";

  async function send() {
    if (!m.phone || !body.trim()) return;
    setSending(true);
    setError("");
    const result = await replyToAgent({ listingId: m.listing_id as string, listingAgentId: m.listing_agent_id, agentId: m.agent_id, phone: m.phone, body });
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setBody("");
    setReplying(false);
    onReplied();
  }

  async function promote() {
    setPromoting(true);
    const result = await promoteAgentToContact({ name: m.name, brokerage: m.brokerage, email: m.email, phone: m.phone });
    setPromoting(false);
    if (result.ok) setPromoted(true);
  }

  return (
    <div className="border-b border-neutral-100 px-[18px] py-3.5 last:border-b-0">
      <div className="flex items-start gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
          {m.channel === "call" ? <PhoneIncoming size={18} /> : <MessageSquareText size={18} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-neutral-900">
            {m.name}
            {m.brokerage ? ` · ${m.brokerage}` : ""}
          </p>
          <p className="mt-0.5 text-[15px] text-neutral-700">{m.channel === "call" ? m.body : `"${m.body}"`}</p>
          <p className="mt-0.5 text-sm text-neutral-400">{relativeTime(m.occurred_at)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {m.phone && (
            <button type="button" onClick={() => openQuoCall(m.phone!)} className="flex items-center gap-1.5 rounded-[10px] border border-neutral-200 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800">
              <Phone size={14} className="text-neutral-400" /> Call back
            </button>
          )}
          {needsReply && m.phone && (
            <button type="button" onClick={() => setReplying((v) => !v)} className="flex items-center gap-1.5 rounded-[10px] bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white">
              <MessageSquare size={14} /> Reply
            </button>
          )}
        </div>
      </div>

      {replying && (
        <div className="mt-2.5 ml-14">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} className="w-full rounded-xl border border-neutral-200 p-2.5 text-sm" placeholder="Write a reply…" />
          <div className="mt-1.5 flex items-center gap-2">
            <button type="button" onClick={send} disabled={sending || !body.trim()} className="rounded-[10px] bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
              {sending ? "Sending…" : "Send"}
            </button>
            <button type="button" onClick={() => setReplying(false)} className="text-sm font-medium text-neutral-500">
              Cancel
            </button>
          </div>
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
      )}

      <div className="mt-2.5 ml-14">
        {promoted ? (
          <p className="flex items-center gap-1.5 text-sm text-emerald-700">
            <CircleCheck size={14} /> Added as a contact
          </p>
        ) : (
          <button type="button" onClick={promote} disabled={promoting} className="flex items-center gap-1.5 text-sm font-medium text-neutral-600 disabled:opacity-50">
            <UserPlus size={13} className="text-neutral-400" /> {promoting ? "Adding…" : "Add to contacts as Referral Partner"}
          </button>
        )}
      </div>
    </div>
  );
}

export function ActivityTab({
  listingId,
  listingAddress,
  listingCreatedAt,
  priceChanges,
  sends,
  messages,
}: {
  listingId: string;
  listingAddress: string;
  listingCreatedAt: string;
  priceChanges: ListingPriceChange[];
  sends: ListingSend[];
  messages: (ListingAgentMessage & { name: string; brokerage: string | null; phone: string | null; email: string | null })[];
}) {
  const router = useRouter();
  const timeline = buildTimeline(priceChanges, sends, listingCreatedAt);

  const latestPrice = priceChanges[0];
  const daysOnMarket = Math.max(1, Math.round((Date.now() - new Date(listingCreatedAt).getTime()) / (24 * 60 * 60 * 1000)));

  // One row per agent thread - the latest message stands in for the
  // whole conversation, same convention as the Messages inbox's
  // conversation list.
  const latestByAgent = new Map<string, (typeof messages)[number]>();
  for (const m of messages) {
    const key = m.listing_agent_id ?? m.agent_id ?? m.id;
    if (!latestByAgent.has(key)) latestByAgent.set(key, m);
  }
  const threads = [...latestByAgent.values()];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#ebe9e7] bg-white">
        <div className="px-[18px] py-4">
          <h2 className="text-base font-semibold text-neutral-900">{listingAddress} · history</h2>
          <p className="mt-0.5 text-sm text-neutral-500">
            {daysOnMarket} day{daysOnMarket === 1 ? "" : "s"} on market
            {latestPrice ? ` · listed ${formatCurrency(priceChanges[priceChanges.length - 1]?.old_price ?? latestPrice.new_price)} · now ${formatCurrency(latestPrice.new_price)}` : ""}
          </p>
        </div>
        {timeline.length === 0 ? (
          <p className="border-t border-neutral-100 px-[18px] py-6 text-[15px] text-neutral-400">Nothing recorded yet.</p>
        ) : (
          <div className="border-t border-neutral-100">
            {timeline.map((t) => {
              const Icon = t.icon;
              return (
                <div key={t.key} className="flex items-start gap-3 border-b border-neutral-100 px-[18px] py-3 last:border-b-0">
                  <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
                    <Icon size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-neutral-900">{t.label}</p>
                    {t.detail && <p className="text-sm text-neutral-500">{t.detail}</p>}
                  </div>
                  <span className="shrink-0 text-sm text-neutral-400">{formatLocal(t.when, "MMM d")}</span>
                </div>
              );
            })}
          </div>
        )}
        <p className="border-t border-neutral-100 px-[18px] py-2.5 text-sm text-neutral-400">
          Price history is what makes the price-drop send possible, and this list is the seller update: what you did, when, and what it produced.
        </p>
      </div>

      <div className="rounded-2xl border border-[#ebe9e7] bg-white">
        <div className="px-[18px] py-4">
          <h2 className="text-base font-semibold text-neutral-900">When an agent calls or texts you</h2>
          <p className="mt-0.5 text-sm leading-5 text-neutral-500">
            The webhook checks the number against the directory before it creates anything. A match logs the call with their name and brokerage and skips
            contact creation, the engagement tag, and the AI read.
          </p>
        </div>
        <div className="flex items-center gap-2 border-y border-neutral-100 bg-neutral-50 px-[18px] py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Agents {threads.length}</span>
          <span className="ml-auto text-xs text-neutral-500">Not counted in your inbox badge or any metric</span>
        </div>
        {threads.length === 0 ? (
          <p className="px-[18px] py-6 text-[15px] text-neutral-400">No agent calls or texts yet.</p>
        ) : (
          threads.map((m) => <MessageRow key={m.id} m={m} onReplied={() => router.refresh()} />)
        )}
      </div>
    </div>
  );
}
