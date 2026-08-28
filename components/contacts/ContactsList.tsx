"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ContactRow } from "@/components/contacts/ContactRow";
import { BulkTagModal } from "@/components/contacts/BulkTagModal";
import { BulkSequenceModal } from "@/components/contacts/BulkSequenceModal";
import { BulkStageModal } from "@/components/contacts/BulkStageModal";
import { BulkLeadSourceModal } from "@/components/contacts/BulkLeadSourceModal";
import { BulkTypeModal } from "@/components/contacts/BulkTypeModal";
import { TextBlastModal } from "@/components/contacts/TextBlastModal";
import { useSectionOpen } from "@/lib/hooks/useSectionOpen";
import { groupContacts } from "@/lib/crm/contact-grouping";
import type { ContactGroupBy } from "@/lib/crm/contact-filter-params";
import type { ContactWithRelations, PipelineStage, Tag } from "@/types/database";

type SequenceOption = { id: string; name: string; type: "broadcast" | "drip" | "batch" };
type BulkModal = "add-tag" | "remove-tag" | "sequence" | "stage" | "source" | "type" | "text" | "more" | null;

export function ContactsList({
  contacts,
  tags,
  stages,
  ownerId,
  sequences,
  groupBy = "stage",
  lastActivityLabels,
}: {
  contacts: ContactWithRelations[];
  tags: Tag[];
  stages: PipelineStage[];
  ownerId: string;
  sequences: SequenceOption[];
  groupBy?: ContactGroupBy;
  lastActivityLabels: Map<string, string>;
}) {
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<BulkModal>(null);
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [archiving, setArchiving] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelection() {
    setSelecting(false);
    setSelected(new Set());
    setConfirmingArchive(false);
  }

  function afterAction() {
    setModal(null);
    exitSelection();
    router.refresh();
  }

  async function handleArchive() {
    setArchiving(true);
    const supabase = createClient();
    await supabase.from("contacts").update({ archived: true }).in("id", selectedIds);
    setArchiving(false);
    afterAction();
  }

  const selectedIds = [...selected];
  const selectedContacts = contacts.filter((c) => selected.has(c.id));
  const selectedWithPhone = selectedContacts.filter((c) => c.phone).length;
  const dripSequences = sequences.filter((s) => s.type === "drip");
  const groups = groupContacts(contacts, groupBy, stages);

  return (
    <div className={selecting && selected.size > 0 ? "pb-28" : undefined}>
      <div className="flex items-center justify-between px-4 py-2.5 sm:px-0">
        <button onClick={() => (selecting ? exitSelection() : setSelecting(true))} className="text-sm font-semibold text-brand-600">
          {selecting ? "Cancel" : "Select"}
        </button>
        {selecting && (
          <button
            onClick={() => (selected.size === contacts.length ? setSelected(new Set()) : setSelected(new Set(contacts.map((c) => c.id))))}
            className="text-sm font-medium text-neutral-400 hover:text-neutral-600"
          >
            {selected.size === contacts.length ? "Deselect all" : `Select all ${contacts.length}`}
          </button>
        )}
      </div>

      {contacts.length === 0 ? (
        <p className="px-4 py-10 text-center text-[15px] text-neutral-400">No contacts match. Try clearing filters or add a new contact.</p>
      ) : (
        <div className="space-y-1 px-4 pb-6 sm:px-0">
          {groups.map((group) => (
            <ContactGroup
              key={group.key}
              groupKey={group.key}
              label={group.label}
              contacts={group.contacts}
              stages={stages}
              ownerId={ownerId}
              selecting={selecting}
              selected={selected}
              onToggle={toggle}
              lastActivityLabels={lastActivityLabels}
              onTextGroup={(ids) => {
                setSelected(new Set(ids));
                setModal("text");
              }}
            />
          ))}
        </div>
      )}

      {selecting && selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-40 bg-[#1c1917] p-3.5 shadow-lg md:bottom-0">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2">
            {confirmingArchive ? (
              <>
                <span className="text-[15px] font-semibold text-white">Archive {selected.size} contact{selected.size === 1 ? "" : "s"}?</span>
                <button onClick={handleArchive} disabled={archiving} className="rounded-[10px] bg-red-600 px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {archiving ? "Archiving…" : "Confirm"}
                </button>
                <button onClick={() => setConfirmingArchive(false)} disabled={archiving} className="rounded-[10px] border border-white/25 px-3.5 py-2 text-sm font-medium text-white">
                  Cancel
                </button>
              </>
            ) : (
              <>
                <span className="mr-1 text-[15px] font-semibold text-white">
                  {selected.size} selected · {selectedWithPhone === selected.size ? `all ${selected.size}` : selectedWithPhone} can be texted
                </span>
                <button onClick={() => setModal("text")} disabled={selectedWithPhone === 0} className="rounded-[10px] bg-white px-3.5 py-2 text-sm font-semibold text-neutral-900 disabled:opacity-50">
                  Text them
                </button>
                <button onClick={() => setModal("stage")} className="rounded-[10px] border border-white/25 px-3.5 py-2 text-sm font-medium text-white">
                  Change stage
                </button>
                <button onClick={() => setModal("add-tag")} className="rounded-[10px] border border-white/25 px-3.5 py-2 text-sm font-medium text-white">
                  Tag
                </button>
                <div className="relative">
                  <button onClick={() => setModal(modal === "more" ? null : "more")} className="rounded-[10px] border border-white/25 px-3.5 py-2 text-sm font-medium text-white">
                    More
                  </button>
                  {modal === "more" && (
                    <div className="absolute bottom-full right-0 mb-2 w-44 rounded-xl border border-neutral-200 bg-white p-1 shadow-lg">
                      <button onClick={() => setModal("remove-tag")} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50">
                        Remove tag
                      </button>
                      <button onClick={() => setModal("source")} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50">
                        Change source
                      </button>
                      <button onClick={() => setModal("type")} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50">
                        Change type
                      </button>
                      <button onClick={() => setModal("sequence")} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50">
                        Sequence…
                      </button>
                      <button onClick={() => setConfirmingArchive(true)} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                        Archive
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {modal === "add-tag" && (
        <BulkTagModal mode="add" tags={tags} contactIds={selectedIds} onClose={() => setModal(null)} onDone={afterAction} />
      )}
      {modal === "remove-tag" && (
        <BulkTagModal mode="remove" tags={tags} contactIds={selectedIds} onClose={() => setModal(null)} onDone={afterAction} />
      )}
      {modal === "sequence" && (
        <BulkSequenceModal sequences={dripSequences} contactIds={selectedIds} onClose={() => setModal(null)} onDone={afterAction} />
      )}
      {modal === "stage" && (
        <BulkStageModal contacts={selectedContacts} stages={stages} ownerId={ownerId} onClose={() => setModal(null)} onDone={afterAction} />
      )}
      {modal === "source" && (
        <BulkLeadSourceModal contactIds={selectedIds} onClose={() => setModal(null)} onDone={afterAction} />
      )}
      {modal === "type" && <BulkTypeModal contactIds={selectedIds} onClose={() => setModal(null)} onDone={afterAction} />}
      {modal === "text" && (
        <TextBlastModal
          target={{ kind: "contacts", contactIds: selectedIds, label: `${selectedIds.length} selected contact${selectedIds.length === 1 ? "" : "s"}` }}
          onClose={() => {
            setModal(null);
            exitSelection();
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function ContactGroup({
  groupKey,
  label,
  contacts,
  stages,
  ownerId,
  selecting,
  selected,
  onToggle,
  lastActivityLabels,
  onTextGroup,
}: {
  groupKey: string;
  label: string | null;
  contacts: ContactWithRelations[];
  stages: PipelineStage[];
  ownerId: string;
  selecting: boolean;
  selected: Set<string>;
  onToggle: (id: string) => void;
  lastActivityLabels: Map<string, string>;
  onTextGroup: (ids: string[]) => void;
}) {
  const [open, setOpen] = useSectionOpen(`contacts-group:${groupKey}`, true);
  const withPhone = contacts.filter((c) => c.phone);

  if (!label) {
    // Ungrouped ("none") - just render the rows, no collapsible header.
    return (
      <div className="space-y-2">
        {contacts.map((c) => (
          <ContactRow
            key={c.id}
            contact={c}
            stages={stages}
            ownerId={ownerId}
            selecting={selecting}
            selected={selected.has(c.id)}
            onToggle={() => onToggle(c.id)}
            lastActivityLabel={lastActivityLabels.get(c.id)}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2.5 px-2 py-2.5 text-left"
      >
        {open ? <ChevronDown size={17} className="text-neutral-400" /> : <ChevronRight size={17} className="text-neutral-400" />}
        <span className="text-base font-semibold text-neutral-900">{label}</span>
        <span className="text-[15px] text-neutral-400">{contacts.length}</span>
        {withPhone.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTextGroup(withPhone.map((c) => c.id));
            }}
            className="ml-auto text-[15px] font-semibold text-brand-700"
          >
            Text the {withPhone.length} with numbers
          </button>
        )}
      </button>
      {open && (
        <div className="space-y-2">
          {contacts.map((c) => (
            <ContactRow
              key={c.id}
              contact={c}
              stages={stages}
              ownerId={ownerId}
              selecting={selecting}
              selected={selected.has(c.id)}
              onToggle={() => onToggle(c.id)}
              lastActivityLabel={lastActivityLabels.get(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
