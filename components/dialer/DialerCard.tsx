"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui";
import { DialerCallModal } from "@/components/dialer/DialerCallModal";
import { fullName, formatPhone, initials } from "@/lib/utils";
import type { PipelineStage } from "@/types/database";
import type { DialerContact } from "@/lib/data/dialer";

export function DialerCard({ contact, ownerId, stages }: { contact: DialerContact; ownerId: string; stages: PipelineStage[] }) {
  const [open, setOpen] = useState(false);
  const stage = contact.pipeline_stages;
  const contacted = !!contact.lastCallAt;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 border-b border-neutral-100 px-4 py-3 text-left hover:bg-neutral-50"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
          {initials(contact.first_name, contact.last_name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate font-medium text-neutral-900">{fullName(contact)}</p>
            {stage && (
              <span
                className="max-w-[8rem] shrink-0 truncate rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: `${stage.color}1a`, color: stage.color }}
              >
                {stage.name}
              </span>
            )}
          </div>
          <p className="truncate text-xs text-neutral-500">{formatPhone(contact.phone)}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {contact.lead_source && (
              <Badge className="max-w-[10rem] truncate bg-neutral-100 px-1.5 py-0 text-[10px] text-neutral-600">
                {contact.lead_source}
              </Badge>
            )}
            {contact.contact_tags.map((ct) => (
              <Badge key={ct.tags.id} color={ct.tags.color} className="max-w-[9rem] truncate px-1.5 py-0 text-[10px]">
                {ct.tags.name}
              </Badge>
            ))}
          </div>
        </div>
        <span className={`shrink-0 text-right text-[11px] ${contacted ? "text-neutral-400" : "font-semibold text-red-600"}`}>
          {contacted ? `Called ${formatDistanceToNow(new Date(contact.lastCallAt as string), { addSuffix: true })}` : "New"}
        </span>
      </button>
      {open && <DialerCallModal contact={contact} ownerId={ownerId} stages={stages} onClose={() => setOpen(false)} />}
    </>
  );
}
