"use client";

import { useState } from "react";
import { Mail, MessageSquareText, Phone } from "lucide-react";
import { openQuoCall, openQuoText } from "@/lib/quo/call-link";
import { formatPhone, cn } from "@/lib/utils";
import { AGENT_STATE_LABEL, AGENT_STATE_COLORS } from "@/lib/listings/agent-state";
import type { ListingAgent, ListingAgentState } from "@/types/database";

type Filter = "all" | ListingAgentState;

// Cards, not the design mock's desktop table - one component works at
// every width instead of a table that breaks under 390px (see the Events
// portal's RosterView for the same call).
export function AgentsList({ agents }: { agents: ListingAgent[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts: Record<Filter, number> = {
    all: agents.length,
    not_contacted: agents.filter((a) => a.state === "not_contacted").length,
    emailed: agents.filter((a) => a.state === "emailed").length,
    texted: agents.filter((a) => a.state === "texted").length,
    replied: agents.filter((a) => a.state === "replied").length,
    opted_out: agents.filter((a) => a.state === "opted_out").length,
  };
  const noEmailCount = agents.filter((a) => !a.email).length;

  const filtered = filter === "all" ? agents : agents.filter((a) => a.state === filter);

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: `All ${counts.all}` },
    { key: "not_contacted", label: `Not contacted ${counts.not_contacted}` },
    { key: "emailed", label: `Emailed ${counts.emailed}` },
    { key: "replied", label: `Replied ${counts.replied}` },
    { key: "opted_out", label: `Opted out ${counts.opted_out}` },
  ];

  return (
    <div>
      <div data-noscrollbar className="flex flex-wrap gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "flex h-9 shrink-0 items-center whitespace-nowrap rounded-full px-3 text-sm font-medium",
              filter === f.key ? "bg-neutral-900 text-white" : "border border-neutral-200 bg-white text-neutral-600",
            )}
          >
            {f.label}
          </button>
        ))}
        {noEmailCount > 0 && (
          <span className="flex h-9 shrink-0 items-center whitespace-nowrap rounded-full border border-[#fde68a] bg-[#fffbeb] px-3 text-sm font-medium text-amber-700">
            No email {noEmailCount}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-[#ebe9e7] bg-white px-4 py-6 text-center text-[15px] text-neutral-400">No one matches this filter.</p>
        ) : (
          filtered.map((a) => {
            const colors = AGENT_STATE_COLORS[a.state];
            return (
              <div key={a.id} className="rounded-2xl border border-[#ebe9e7] bg-white p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-neutral-900">{a.name}</p>
                    <p className="truncate text-sm text-neutral-500">{a.brokerage || "—"}</p>
                    <p className="truncate text-sm text-neutral-400">{[a.email, formatPhone(a.phone)].filter(Boolean).join(" · ") || "No contact on file"}</p>
                    <p className="mt-0.5 text-xs text-neutral-400">
                      Ref {a.ref_no}
                      {a.count_sent != null ? ` · ${a.count_sent} sent` : ""}
                      {a.date_sent ? ` · ${a.date_sent}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: colors.bg, color: colors.text }}>
                    {AGENT_STATE_LABEL[a.state]}
                  </span>
                </div>
                {a.state !== "opted_out" && (a.email || a.phone) && (
                  <div className="mt-2.5 flex gap-2">
                    {a.email && (
                      <span className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-neutral-200 bg-white text-sm font-semibold text-neutral-700">
                        <Mail size={14} className="text-neutral-400" /> Email
                      </span>
                    )}
                    {a.phone && (
                      <>
                        <button
                          type="button"
                          onClick={() => openQuoText(a.phone!)}
                          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-neutral-200 bg-white text-sm font-semibold text-neutral-700"
                        >
                          <MessageSquareText size={14} className="text-neutral-400" /> Text
                        </button>
                        <button
                          type="button"
                          onClick={() => openQuoCall(a.phone!)}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-neutral-200 bg-white text-neutral-500"
                        >
                          <Phone size={15} />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
