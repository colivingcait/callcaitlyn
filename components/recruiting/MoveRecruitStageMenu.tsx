"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changeRecruitStage } from "@/app/(app)/recruiting/actions";
import { AGENT_RECRUIT_STAGES, recruitStageKey } from "@/lib/crm/agent-recruit-stages";
import type { RecruitStage } from "@/types/database";

// Same "Move to..." dropdown shape as Pipeline's MoveToMenu - the only
// side effect a stage change here needs (stamping recruit_joined_at/
// recruit_fee_received_at) lives in changeRecruitStage itself.
export function MoveRecruitStageMenu({ contactId, currentStage }: { contactId: string; currentStage: RecruitStage | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function move(stage: RecruitStage | null) {
    setOpen(false);
    setBusy(true);
    await changeRecruitStage(contactId, stage);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        disabled={busy}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-neutral-200 bg-white px-3.5 py-2 text-sm font-semibold text-neutral-800 disabled:opacity-50"
      >
        {busy ? "Moving…" : "Move to…"}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
            }}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div className="absolute right-0 top-full z-40 mt-1 w-56 overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
            {AGENT_RECRUIT_STAGES.filter((s) => recruitStageKey(s.value) !== recruitStageKey(currentStage)).map((s) => (
              <button
                key={recruitStageKey(s.value)}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  move(s.value);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
              >
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
