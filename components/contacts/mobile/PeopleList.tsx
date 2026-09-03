"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquareText, StickyNote, Clock } from "lucide-react";
import { ListRow } from "@/components/mobile/ListRow";
import { SwipeActions } from "@/components/mobile/SwipeActions";
import { StickyGroupHeader } from "@/components/mobile/StickyGroupHeader";
import { LogSheet } from "@/components/contacts/mobile/LogSheet";
import { snoozeFollowUp } from "@/app/(app)/today-actions";
import { groupContacts } from "@/lib/crm/contact-grouping";
import { useToast } from "@/lib/hooks/useToast";
import { Toast } from "@/components/mobile/Toast";
import type { ContactWithRelations, PipelineStage } from "@/types/database";

export function PeopleList({
  contacts,
  stages,
  ownerId,
  grouped,
}: {
  contacts: ContactWithRelations[];
  stages: PipelineStage[];
  ownerId: string;
  grouped: boolean;
}) {
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [logContact, setLogContact] = useState<{ id: string; name: string } | null>(null);

  const groups = groupContacts(contacts, grouped ? "stage" : "none", stages);

  async function snooze(contactId: string) {
    const res = await snoozeFollowUp(contactId);
    if (!res.ok) showToast("Couldn't snooze that", "error");
    else router.refresh();
  }

  return (
    <div className="rounded-[16px] border border-[#ebe9e7] bg-white">
      {groups.map((group) => (
        <StickyGroupHeader
          key={group.key}
          label={group.label || "All"}
          count={group.contacts.length}
          collapsible={grouped}
          sectionKey={`people:stage:${group.key}`}
          defaultOpen
        >
          <div className="divide-y divide-neutral-100">
            {group.contacts.map((contact) => {
              const name = `${contact.first_name} ${contact.last_name}`.trim();
              const actions = [
                ...(contact.phone
                  ? [{ icon: MessageSquareText, label: "Text", bg: "#e7e5e4", onClick: () => router.push(`/messages/${contact.id}`) }]
                  : []),
                { icon: StickyNote, label: "Log", bg: "#292524", onClick: () => setLogContact({ id: contact.id, name }) },
                { icon: Clock, label: "Snooze", bg: "#ac3826", onClick: () => snooze(contact.id) },
              ];
              return (
                <SwipeActions key={contact.id} rowId={contact.id} openRowId={openRowId} onOpenChange={setOpenRowId} actions={actions}>
                  <ListRow
                    href={`/contacts/${contact.id}`}
                    avatar={{ firstName: contact.first_name, lastName: contact.last_name }}
                    name={name}
                    secondaryText={contact.lead_source ?? undefined}
                  />
                </SwipeActions>
              );
            })}
            {group.contacts.length === 0 && <p className="px-4 py-4 text-center text-sm text-neutral-400">Nobody here.</p>}
          </div>
        </StickyGroupHeader>
      ))}
      {logContact && <LogSheet open onClose={() => setLogContact(null)} ownerId={ownerId} contactId={logContact.id} contactName={logContact.name} />}
      <Toast toast={toast} />
    </div>
  );
}
