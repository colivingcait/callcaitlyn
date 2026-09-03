"use client";

import Link from "next/link";
import { Phone, MessageSquare } from "lucide-react";
import { Avatar } from "@/components/ui";
import { openQuoCall } from "@/lib/quo/call-link";
import { getPipelineCardContext } from "@/lib/crm/pipeline-card-context";
import { formatCurrency, fullName } from "@/lib/utils";
import { useRouter } from "next/navigation";
import type { ContactWithRelations, PipelineStage } from "@/types/database";
import type { PipelineExtras } from "@/lib/data/pipeline";

export function PipelineMobileRow({
  contact,
  stage,
  extras,
}: {
  contact: ContactWithRelations;
  stage: PipelineStage | undefined;
  extras: PipelineExtras;
}) {
  const router = useRouter();
  const context = getPipelineCardContext(contact, stage, extras);
  const deal = stage?.is_under_contract ? extras.pendingDealByContact.get(contact.id) : undefined;

  function goToThread(e: React.MouseEvent) {
    e.preventDefault();
    router.push(`/messages/${contact.id}`);
  }

  function call(e: React.MouseEvent) {
    e.preventDefault();
    if (contact.phone) openQuoCall(contact.phone);
  }

  return (
    <Link href={`/contacts/${contact.id}`} className="flex items-center gap-3 bg-white px-4 py-3">
      <Avatar firstName={contact.first_name} lastName={contact.last_name} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[16px] font-semibold text-neutral-900">{fullName(contact)}</p>
        {context.line && (
          <p className={`mt-0.5 truncate text-[14px] ${context.quiet ? "font-semibold text-[#b91c1c]" : "text-neutral-500"}`}>{context.line}</p>
        )}
      </div>
      {deal && deal.netCommission > 0 && (
        <span className="shrink-0 text-[17px] font-semibold text-neutral-900">{formatCurrency(deal.netCommission)}</span>
      )}
      {contact.phone && (
        <button
          type="button"
          onClick={stage?.is_under_contract ? call : goToThread}
          aria-label={stage?.is_under_contract ? "Call" : "Text"}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-600"
        >
          {stage?.is_under_contract ? <Phone size={18} /> : <MessageSquare size={18} />}
        </button>
      )}
    </Link>
  );
}
