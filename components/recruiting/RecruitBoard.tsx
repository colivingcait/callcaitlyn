"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { RecruitCard } from "@/components/recruiting/RecruitCard";
import { AgentRecruitModal } from "@/components/recruiting/AgentRecruitModal";
import { AGENT_RECRUIT_STAGES } from "@/lib/crm/agent-recruit-stages";
import { formatCurrency } from "@/lib/utils";
import type { AgentRecruit } from "@/types/database";

// Active work (introduced, connected with the team lead) defaults open;
// the two "it's decided" stages and the dead-end bucket default closed -
// same "top of funnel stays visible, resolved stuff tucks away" idea as
// Pipeline's stage ordering.
const DEFAULT_OPEN_STAGES = new Set(["introduced", "connected_with_lead"]);

export function RecruitBoard({ recruits }: { recruits: AgentRecruit[] }) {
  const [adding, setAdding] = useState(false);
  const byStage = new Map<string, AgentRecruit[]>();
  for (const r of recruits) byStage.set(r.stage, [...(byStage.get(r.stage) ?? []), r]);

  const feesReceived = recruits.filter((r) => r.stage === "fee_received").reduce((sum, r) => sum + (r.referral_fee ?? 0), 0);
  const inProgress = recruits.filter((r) => r.stage !== "fee_received" && r.stage !== "not_moving_forward").length;

  return (
    <div className="px-4 pb-8 md:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] text-neutral-500">
          {inProgress} in progress · {formatCurrency(feesReceived)} in fees received
        </p>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 rounded-[10px] bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white"
        >
          <UserPlus size={15} /> Add recruit
        </button>
      </div>

      <div className="space-y-2.5">
        {AGENT_RECRUIT_STAGES.map((stage) => {
          const items = byStage.get(stage.value) ?? [];
          return (
            <Section
              key={stage.value}
              sectionKey={`recruiting:stage:${stage.value}`}
              title={stage.label}
              meta={`${items.length}`}
              defaultOpen={DEFAULT_OPEN_STAGES.has(stage.value)}
            >
              <div className="space-y-2 bg-[#fcfbfa] p-3.5">
                {items.length === 0 ? (
                  <p className="py-4 text-center text-sm text-neutral-400">Nobody here.</p>
                ) : (
                  items.map((r) => <RecruitCard key={r.id} recruit={r} />)
                )}
              </div>
            </Section>
          );
        })}
      </div>

      {adding && <AgentRecruitModal onClose={() => setAdding(false)} />}
    </div>
  );
}
