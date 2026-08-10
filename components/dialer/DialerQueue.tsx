"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Clock } from "lucide-react";
import { DialerCallModal } from "@/components/dialer/DialerCallModal";
import { Badge } from "@/components/ui";
import { fullName, formatPhone, initials } from "@/lib/utils";
import type { DialerContact, DialerMode } from "@/lib/data/dialer";
import type { PipelineStage } from "@/types/database";

export function DialerQueue({
  contacts,
  stages,
  mode,
  emptyMessage = "Nobody left to call — you're caught up.",
}: {
  contacts: DialerContact[];
  stages: PipelineStage[];
  mode: DialerMode;
  emptyMessage?: string;
}) {
  const [selected, setSelected] = useState<DialerContact | null>(null);

  if (contacts.length === 0) {
    return <p className="px-4 py-10 text-center text-sm text-neutral-400">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2 px-4 pb-24">
      {contacts.map((contact) => (
        <button
          key={contact.id}
          onClick={() => setSelected(contact)}
          className="flex w-full items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3.5 text-left shadow-card"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
            {initials(contact.first_name, contact.last_name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate font-medium text-neutral-900">{fullName(contact)}</p>
              {mode === "new-registration" && contact.isNew !== undefined && (
                <Badge
                  className={`shrink-0 px-1.5 py-0 text-[10px] ${contact.isNew ? "bg-brand-50 text-brand-700" : "bg-neutral-100 text-neutral-600"}`}
                >
                  {contact.isNew ? "New" : "Returning"}
                </Badge>
              )}
            </div>
            <p className="truncate text-xs text-neutral-500">{formatPhone(contact.phone)}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-neutral-400">
              {contact.lead_source && <span className="truncate">{contact.lead_source}</span>}
              {contact.last_event_name && <span className="truncate">· {contact.last_event_name}</span>}
              {contact.dialer_snoozed_at && (
                <span className="flex items-center gap-0.5 text-amber-600">
                  <Clock size={10} /> Tried {formatDistanceToNow(new Date(contact.dialer_snoozed_at), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
        </button>
      ))}

      {selected && <DialerCallModal contact={selected} stages={stages} mode={mode} onClose={() => setSelected(null)} />}
    </div>
  );
}
