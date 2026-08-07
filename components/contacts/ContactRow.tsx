import Link from "next/link";
import { fullName, formatPhone, initials, CONTACT_TYPE_LABELS } from "@/lib/utils";
import { RepresentingBadge } from "@/components/contacts/RepresentingBadge";
import type { ContactWithRelations } from "@/types/database";

export function ContactRow({ contact }: { contact: ContactWithRelations }) {
  const stage = contact.pipeline_stages;

  return (
    <Link
      href={`/contacts/${contact.id}`}
      className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3 hover:bg-neutral-50 md:px-2"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
        {initials(contact.first_name, contact.last_name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate font-medium text-neutral-900">
          {fullName(contact)}
          <RepresentingBadge representing={contact.representing} />
        </p>
        <p className="truncate text-xs text-neutral-400">
          {[CONTACT_TYPE_LABELS[contact.contact_type], formatPhone(contact.phone)].filter(Boolean).join(" · ")}
        </p>
      </div>
      {stage && (
        <span
          className="hidden shrink-0 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex"
          style={{ backgroundColor: `${stage.color}1a`, color: stage.color }}
        >
          {stage.name}
        </span>
      )}
    </Link>
  );
}
