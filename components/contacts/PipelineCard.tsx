import Link from "next/link";
import { fullName, formatPhone, initials, CONTACT_TYPE_LABELS } from "@/lib/utils";
import { StageSelector } from "@/components/contacts/StageSelector";
import type { ContactWithRelations, PipelineStage } from "@/types/database";

export function PipelineCard({ contact, stages }: { contact: ContactWithRelations; stages: PipelineStage[] }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3">
      <Link href={`/contacts/${contact.id}`} className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
          {initials(contact.first_name, contact.last_name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-neutral-900">{fullName(contact)}</p>
          <p className="truncate text-xs text-neutral-400">
            {[CONTACT_TYPE_LABELS[contact.contact_type], formatPhone(contact.phone)].filter(Boolean).join(" · ")}
          </p>
        </div>
      </Link>
      <div className="mt-2.5">
        <StageSelector
          contactId={contact.id}
          ownerId={contact.owner_id}
          currentStageId={contact.stage_id}
          stages={stages}
        />
      </div>
    </div>
  );
}
