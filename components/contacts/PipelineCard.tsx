import Link from "next/link";
import { fullName, formatPhone, initials, CONTACT_TYPE_LABELS } from "@/lib/utils";
import { StageSelector } from "@/components/contacts/StageSelector";
import { RepresentingBadge } from "@/components/contacts/RepresentingBadge";
import { LikelihoodBadge } from "@/components/contacts/LikelihoodBadge";
import { computeLikelihood } from "@/lib/crm/likelihood";
import type { ContactWithRelations, PipelineStage } from "@/types/database";

export function PipelineCard({ contact, stages }: { contact: ContactWithRelations; stages: PipelineStage[] }) {
  const likelihood = computeLikelihood(contact, stages);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3">
      <Link href={`/contacts/${contact.id}`} className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
          {initials(contact.first_name, contact.last_name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-medium text-neutral-900">
            {fullName(contact)}
            <RepresentingBadge representing={contact.representing} />
          </p>
          <p className="truncate text-xs text-neutral-400">
            {[CONTACT_TYPE_LABELS[contact.contact_type], formatPhone(contact.phone)].filter(Boolean).join(" · ")}
          </p>
        </div>
        <LikelihoodBadge likelihood={likelihood} />
      </Link>
      <div className="mt-2.5">
        <StageSelector
          contactId={contact.id}
          ownerId={contact.owner_id}
          currentStageId={contact.stage_id}
          stages={stages}
          contactName={fullName(contact)}
          contactCreatedAt={contact.created_at}
          representing={contact.representing}
        />
      </div>
    </div>
  );
}
