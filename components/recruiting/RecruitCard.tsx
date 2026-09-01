"use client";

import Link from "next/link";
import { Phone, MessageSquareText } from "lucide-react";
import { openQuoCall, openQuoText } from "@/lib/quo/call-link";
import { formatCurrency, initials, fullName } from "@/lib/utils";
import { relativeTime } from "@/lib/format-time";
import { MoveRecruitStageMenu } from "@/components/recruiting/MoveRecruitStageMenu";
import type { Contact } from "@/types/database";

export function RecruitCard({ contact }: { contact: Contact }) {
  const metaParts = [
    contact.referral_fee != null ? `${formatCurrency(contact.referral_fee)} referral fee` : null,
    `Added ${relativeTime(contact.created_at)}`,
  ].filter(Boolean);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#ebe9e7] bg-white p-3.5">
      <Link href={`/contacts/${contact.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold text-neutral-600">
          {initials(contact.first_name, contact.last_name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold leading-6 text-neutral-900">{fullName(contact)}</p>
          <p className="truncate text-[14px] leading-5 text-neutral-500">{metaParts.join(" · ")}</p>
        </div>
      </Link>
      <div className="flex shrink-0 items-center gap-1.5">
        {contact.phone && (
          <>
            <button
              type="button"
              onClick={() => openQuoCall(contact.phone!)}
              className="rounded-[10px] border border-neutral-200 bg-white p-2 text-neutral-500"
            >
              <Phone size={14} />
            </button>
            <button
              type="button"
              onClick={() => openQuoText(contact.phone!)}
              className="rounded-[10px] border border-neutral-200 bg-white p-2 text-neutral-500"
            >
              <MessageSquareText size={14} />
            </button>
          </>
        )}
        <MoveRecruitStageMenu contactId={contact.id} currentStage={contact.recruit_stage} />
      </div>
    </div>
  );
}
