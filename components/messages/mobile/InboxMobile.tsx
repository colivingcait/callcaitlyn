"use client";

import { useState } from "react";
import Link from "next/link";
import { Archive } from "lucide-react";
import { NewMessageButton } from "@/components/messages/NewMessageButton";
import { InstagramStrangerRow } from "@/components/messages/InstagramStrangerRow";
import { InboxRow } from "@/components/messages/mobile/InboxRow";
import { StickyGroupHeader } from "@/components/mobile/StickyGroupHeader";
import type { Conversation, TextableContact } from "@/lib/data/messages";
import type { InstagramThread } from "@/lib/data/instagram";
import type { MergeCandidate } from "@/lib/data/contacts";

type Filter = "owed" | "all" | "calls";

export function InboxMobile({
  conversations,
  contacts,
  instagramThreads,
  mergeCandidates,
  ownerId,
}: {
  conversations: Conversation[];
  contacts: TextableContact[];
  instagramThreads: InstagramThread[];
  mergeCandidates: MergeCandidate[];
  ownerId: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [openRowId, setOpenRowId] = useState<string | null>(null);

  const owedCount = conversations.filter((c) => c.owed).length;
  const visible =
    filter === "owed" ? conversations.filter((c) => c.owed) : filter === "calls" ? conversations.filter((c) => c.lastActivity.type === "call") : conversations;
  const owedVisible = visible.filter((c) => c.owed);
  const notOwedVisible = visible.filter((c) => !c.owed);

  return (
    <div className="pb-4 md:hidden">
      <div className="flex items-start justify-between gap-3 px-4 pt-5 pb-3">
        <div>
          <p className="font-serif text-2xl font-semibold text-neutral-900">Inbox</p>
          <p className="mt-0.5 text-[15px] text-neutral-500">
            {owedCount > 0 ? `${owedCount} ${owedCount === 1 ? "person is" : "people are"} waiting on you.` : "Nothing waiting on you."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/messages?hidden=1" aria-label="Hidden threads" className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-200 text-neutral-500">
            <Archive size={18} />
          </Link>
          <NewMessageButton contacts={contacts} />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 pb-3">
        {[
          { value: "owed" as Filter, label: `Needs a reply ${owedCount}` },
          { value: "all" as Filter, label: `All ${conversations.length}` },
          { value: "calls" as Filter, label: "Calls" },
        ].map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => setFilter(chip.value)}
            className={`h-11 shrink-0 whitespace-nowrap rounded-full px-3.5 text-[14px] font-medium ${filter === chip.value ? "bg-neutral-900 text-white" : "border border-neutral-200 text-neutral-600"}`}
          >
            {chip.label}
          </button>
        ))}
        {instagramThreads.length > 0 && (
          <span className="flex h-11 shrink-0 items-center whitespace-nowrap rounded-full border border-neutral-200 px-3.5 text-[14px] font-medium text-neutral-600">
            Instagram {instagramThreads.length}
          </span>
        )}
      </div>

      {instagramThreads.length > 0 && (
        <div className="mb-3 px-4">
          <StickyGroupHeader label="Instagram · new" count={instagramThreads.length} collapsible sectionKey="messages:instagram-mobile" defaultOpen>
            <div className="divide-y divide-neutral-100 rounded-b-[14px] border border-t-0 border-[#ebe9e7] bg-white">
              {instagramThreads.map((thread) => (
                <InstagramStrangerRow key={thread.igSenderId} thread={thread} contacts={mergeCandidates} />
              ))}
            </div>
          </StickyGroupHeader>
        </div>
      )}

      <div className="rounded-[16px] border border-[#ebe9e7] bg-white">
        {visible.length === 0 ? (
          <p className="py-10 text-center text-[15px] text-neutral-400">{filter === "owed" ? "Nothing owed." : "Nothing here yet."}</p>
        ) : (
          <>
            {owedVisible.length > 0 && (
              <StickyGroupHeader label="Waiting on you" count={owedVisible.length}>
                <div className="divide-y divide-neutral-100">
                  {owedVisible.map((c) => (
                    <InboxRow key={c.contact.id} conversation={c} ownerId={ownerId} openRowId={openRowId} onOpenChange={setOpenRowId} />
                  ))}
                </div>
              </StickyGroupHeader>
            )}
            {notOwedVisible.length > 0 && (
              <StickyGroupHeader label="Nothing owed" count={notOwedVisible.length}>
                <div className="divide-y divide-neutral-100">
                  {notOwedVisible.map((c) => (
                    <InboxRow key={c.contact.id} conversation={c} ownerId={ownerId} openRowId={openRowId} onOpenChange={setOpenRowId} />
                  ))}
                </div>
              </StickyGroupHeader>
            )}
          </>
        )}
      </div>
    </div>
  );
}
