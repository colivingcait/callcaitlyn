import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { RecruitCard } from "@/components/recruiting/RecruitCard";
import { AGENT_RECRUIT_STAGES, recruitStageKey } from "@/lib/crm/agent-recruit-stages";
import { formatCurrency } from "@/lib/utils";
import type { Contact } from "@/types/database";

// Active work (potential, introduced, connected with the team lead)
// defaults open; the two "it's decided" stages and the dead-end bucket
// default closed - same "top of funnel stays visible, resolved stuff
// tucks away" idea as Pipeline's stage ordering.
const DEFAULT_OPEN_KEYS = new Set(["potential", "introduced", "connected_with_lead"]);

export function RecruitBoard({ recruits }: { recruits: Contact[] }) {
  const byStage = new Map<string, Contact[]>();
  for (const r of recruits) {
    const key = recruitStageKey(r.recruit_stage);
    byStage.set(key, [...(byStage.get(key) ?? []), r]);
  }

  const feesReceived = recruits.filter((r) => r.recruit_stage === "fee_received").reduce((sum, r) => sum + (r.referral_fee ?? 0), 0);
  const inProgress = recruits.filter((r) => r.recruit_stage !== "fee_received" && r.recruit_stage !== "not_moving_forward").length;

  return (
    <div className="px-4 pb-8 md:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] text-neutral-500">
          {inProgress} in progress · {formatCurrency(feesReceived)} in fees received
        </p>
        <Link
          href="/contacts/new?tag=Agent"
          className="flex items-center gap-1.5 rounded-[10px] bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white"
        >
          <UserPlus size={15} /> Add recruit
        </Link>
      </div>

      <div className="space-y-2.5">
        {AGENT_RECRUIT_STAGES.map((stage) => {
          const key = recruitStageKey(stage.value);
          const items = byStage.get(key) ?? [];
          return (
            <Section
              key={key}
              sectionKey={`recruiting:stage:${key}`}
              title={stage.label}
              meta={`${items.length}`}
              defaultOpen={DEFAULT_OPEN_KEYS.has(key)}
            >
              <div className="space-y-2 bg-[#fcfbfa] p-3.5">
                {items.length === 0 ? (
                  <p className="py-4 text-center text-sm text-neutral-400">Nobody here.</p>
                ) : (
                  items.map((r) => <RecruitCard key={r.id} contact={r} />)
                )}
              </div>
            </Section>
          );
        })}
      </div>

      {recruits.length === 0 && (
        <p className="mt-4 text-[15px] text-neutral-500">
          Tag a contact &quot;Agent&quot; and they&apos;ll show up here automatically.
        </p>
      )}
    </div>
  );
}
