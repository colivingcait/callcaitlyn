import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Phone, MessageSquare, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { fullName, initials } from "@/lib/utils";
import type { Conversation } from "@/lib/data/messages";

export function ConversationRow({ conversation }: { conversation: Conversation }) {
  const { contact, lastActivity } = conversation;
  const Icon = lastActivity.type === "call" ? Phone : MessageSquare;

  let preview = lastActivity.body ?? (lastActivity.type === "call" ? "Call" : "");
  if (lastActivity.type === "call" && lastActivity.body) {
    preview = lastActivity.body.split(" · ")[0] ? `Call · ${lastActivity.body.split(" · ")[0]}` : "Call";
  }

  return (
    <Link
      href={`/messages/${contact.id}`}
      className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3 hover:bg-neutral-50"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
        {initials(contact.first_name, contact.last_name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-neutral-900">{fullName(contact)}</p>
        <div className="flex items-center gap-1 text-xs text-neutral-500">
          <Icon size={12} className="shrink-0 text-neutral-400" />
          {lastActivity.direction === "inbound" && <ArrowDownLeft size={11} className="shrink-0" />}
          {lastActivity.direction === "outbound" && <ArrowUpRight size={11} className="shrink-0" />}
          <span className="truncate">{preview || "—"}</span>
        </div>
      </div>
      <span className="shrink-0 text-xs text-neutral-400">
        {formatDistanceToNow(new Date(lastActivity.occurred_at), { addSuffix: true })}
      </span>
    </Link>
  );
}
