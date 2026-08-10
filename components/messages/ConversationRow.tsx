import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Phone, MessageSquare, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { fullName, initials } from "@/lib/utils";
import { computeLikelihood } from "@/lib/crm/likelihood";
import { LikelihoodBadge } from "@/components/contacts/LikelihoodBadge";
import { ConversationActions } from "@/components/messages/ConversationActions";
import { Badge } from "@/components/ui";
import type { Conversation } from "@/lib/data/messages";
import type { PipelineStage } from "@/types/database";

export function ConversationRow({ conversation, stages }: { conversation: Conversation; stages: PipelineStage[] }) {
  const { contact, lastActivity } = conversation;
  const Icon = lastActivity.type === "call" ? Phone : MessageSquare;
  const stage = contact.pipeline_stages;
  const likelihood = computeLikelihood(contact as Parameters<typeof computeLikelihood>[0], stages);

  let preview = lastActivity.body ?? (lastActivity.type === "call" ? "Call" : "");
  if (lastActivity.type === "call" && lastActivity.body) {
    preview = lastActivity.body.split(" · ")[0] ? `Call · ${lastActivity.body.split(" · ")[0]}` : "Call";
  }

  return (
    <div className="flex items-center gap-1 border-b border-neutral-100 pr-2 hover:bg-neutral-50">
      <Link href={`/messages/${contact.id}`} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
          {initials(contact.first_name, contact.last_name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate font-medium text-neutral-900">{fullName(contact)}</p>
            {stage && (
              <span
                className="max-w-[8rem] shrink-0 truncate rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: `${stage.color}1a`, color: stage.color }}
              >
                {stage.name}
              </span>
            )}
            <LikelihoodBadge likelihood={likelihood} />
          </div>
          <div className="flex items-center gap-1 text-xs text-neutral-500">
            <Icon size={12} className="shrink-0 text-neutral-400" />
            {lastActivity.direction === "inbound" && <ArrowDownLeft size={11} className="shrink-0" />}
            {lastActivity.direction === "outbound" && <ArrowUpRight size={11} className="shrink-0" />}
            <span className="truncate">{preview || "—"}</span>
          </div>
          {contact.contact_tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {contact.contact_tags.map((ct) => (
                <Badge key={ct.tags.id} color={ct.tags.color} className="max-w-[9rem] truncate px-1.5 py-0 text-[10px]">
                  {ct.tags.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <span className="shrink-0 text-xs text-neutral-400">
          {formatDistanceToNow(new Date(lastActivity.occurred_at), { addSuffix: true })}
        </span>
      </Link>
      <ConversationActions contactId={contact.id} hidden={contact.archived} />
    </div>
  );
}
