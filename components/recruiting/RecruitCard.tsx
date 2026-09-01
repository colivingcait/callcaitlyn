"use client";

import { useState } from "react";
import { Phone, MessageSquareText } from "lucide-react";
import { openQuoCall, openQuoText } from "@/lib/quo/call-link";
import { formatPhone, formatCurrency, initials } from "@/lib/utils";
import { relativeTime } from "@/lib/format-time";
import { MoveRecruitStageMenu } from "@/components/recruiting/MoveRecruitStageMenu";
import { AgentRecruitModal } from "@/components/recruiting/AgentRecruitModal";
import type { AgentRecruit } from "@/types/database";

export function RecruitCard({ recruit }: { recruit: AgentRecruit }) {
  const [editing, setEditing] = useState(false);

  const metaParts = [
    recruit.current_brokerage,
    recruit.referral_fee != null ? `${formatCurrency(recruit.referral_fee)} referral fee` : null,
    `Added ${relativeTime(recruit.created_at)}`,
  ].filter(Boolean);

  return (
    <>
      <div className="flex items-center gap-3 rounded-xl border border-[#ebe9e7] bg-white p-3.5">
        <button type="button" onClick={() => setEditing(true)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold text-neutral-600">
            {initials(recruit.first_name, recruit.last_name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-semibold leading-6 text-neutral-900">
              {recruit.first_name} {recruit.last_name}
            </p>
            <p className="truncate text-[14px] leading-5 text-neutral-500">{metaParts.join(" · ")}</p>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-1.5">
          {recruit.phone && (
            <>
              <button
                type="button"
                onClick={() => openQuoCall(recruit.phone!)}
                className="rounded-[10px] border border-neutral-200 bg-white p-2 text-neutral-500"
              >
                <Phone size={14} />
              </button>
              <button
                type="button"
                onClick={() => openQuoText(recruit.phone!)}
                className="rounded-[10px] border border-neutral-200 bg-white p-2 text-neutral-500"
              >
                <MessageSquareText size={14} />
              </button>
            </>
          )}
          <MoveRecruitStageMenu recruitId={recruit.id} currentStage={recruit.stage} />
        </div>
      </div>
      {editing && <AgentRecruitModal recruit={recruit} onClose={() => setEditing(false)} />}
    </>
  );
}
