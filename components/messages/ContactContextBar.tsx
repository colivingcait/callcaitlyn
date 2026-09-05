import { Badge } from "@/components/ui";
import { RepresentingBadge } from "@/components/contacts/RepresentingBadge";
import { LikelihoodBadge } from "@/components/contacts/LikelihoodBadge";
import { computeLikelihood } from "@/lib/crm/likelihood";
import { formatCurrency, TIMELINE_LABELS } from "@/lib/utils";
import { formatLocal, isTodayLocal } from "@/lib/format-time";
import { CalendarClock } from "lucide-react";
import type { ContactWithRelations, PipelineStage } from "@/types/database";

// Everything worth knowing at a glance before texting someone - who they
// are in the pipeline, how urgent, and whether they're overdue for a
// follow-up - without leaving the thread to go check their profile.
export function ContactContextBar({ contact, stages }: { contact: ContactWithRelations; stages: PipelineStage[] }) {
  const stage = contact.pipeline_stages;
  const likelihood = computeLikelihood(contact, stages);
  const isOverdue = !!contact.next_follow_up_at && new Date(contact.next_follow_up_at) < new Date() && !isTodayLocal(contact.next_follow_up_at);
  const hasBudget = contact.budget_min || contact.budget_max;

  return (
    <div className="space-y-1.5 border-b border-neutral-100 bg-neutral-50/60 px-3 py-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {stage && (
          <Badge className="max-w-[10rem] truncate px-2 py-0.5 text-[11px]" color={stage.color}>
            {stage.name}
          </Badge>
        )}
        <RepresentingBadge representing={contact.representing} />
        <LikelihoodBadge likelihood={likelihood} />
        {contact.timeline && contact.timeline !== "unknown" && (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">
            {TIMELINE_LABELS[contact.timeline]}
          </span>
        )}
        {contact.contact_tags
          .filter((ct) => ct.tags)
          .map((ct) => (
            <Badge key={ct.tags!.id} color={ct.tags!.color} className="max-w-[10rem] truncate px-2 py-0.5 text-[11px]">
              {ct.tags!.name}
            </Badge>
          ))}
      </div>
      {(contact.next_follow_up_at || hasBudget) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500">
          {contact.next_follow_up_at && (
            <span className={`flex items-center gap-1 ${isOverdue ? "font-medium text-red-600" : ""}`}>
              <CalendarClock size={12} />
              {isOverdue ? "Follow-up overdue: " : "Follow-up: "}
              {formatLocal(contact.next_follow_up_at, "MMM d")}
            </span>
          )}
          {hasBudget && (
            <span>
              Budget: {contact.budget_min ? formatCurrency(contact.budget_min) : "—"}
              {" – "}
              {contact.budget_max ? formatCurrency(contact.budget_max) : "—"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
