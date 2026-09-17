"use client";

import { useState } from "react";
import { ConversationRow } from "@/components/messages/ConversationRow";
import type { Conversation } from "@/lib/data/messages";

export function CappedConversationList({
  conversations,
  filter,
  hidden,
  initial = 6,
}: {
  conversations: Conversation[];
  filter?: string | null;
  hidden?: boolean;
  initial?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? conversations : conversations.slice(0, initial);
  const remaining = conversations.length - visible.length;

  return (
    <>
      {visible.map((c) => (
        <ConversationRow key={c.contact.id} conversation={c} filter={filter} hidden={hidden} />
      ))}
      {remaining > 0 && (
        <button type="button" onClick={() => setExpanded(true)} className="px-0.5 py-2 text-left text-[15px] font-semibold text-[#c45c4a]">
          Show the rest ({remaining} more)
        </button>
      )}
    </>
  );
}

export function NotOwedList({
  conversations,
  filter,
  hidden,
}: {
  conversations: Conversation[];
  filter?: string | null;
  hidden?: boolean;
}) {
  return <CappedConversationList conversations={conversations} filter={filter} hidden={hidden} initial={3} />;
}
