"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ContactRow } from "@/components/contacts/ContactRow";
import { BulkTagModal } from "@/components/contacts/BulkTagModal";
import { BulkSequenceModal } from "@/components/contacts/BulkSequenceModal";
import { Button } from "@/components/ui";
import type { ContactWithRelations, Tag } from "@/types/database";

type SequenceOption = { id: string; name: string; type: "broadcast" | "drip" };
type BulkModal = "add-tag" | "remove-tag" | "sequence" | null;

export function ContactsList({
  contacts,
  tags,
  sequences,
}: {
  contacts: ContactWithRelations[];
  tags: Tag[];
  sequences: SequenceOption[];
}) {
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<BulkModal>(null);

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
  }

  function afterAction() {
    setModal(null);
    exitSelection();
    router.refresh();
  }

  const selectedIds = [...selected];
  const dripSequences = sequences.filter((s) => s.type === "drip");

  return (
    <div className={selecting && selected.size > 0 ? "pb-24" : undefined}>
      <div className="flex items-center justify-between px-4 py-2">
        <button
          onClick={() => (selecting ? exitSelection() : setSelecting(true))}
          className="text-sm font-medium text-brand-600"
        >
          {selecting ? "Cancel" : "Select"}
        </button>
        {selecting && <span className="text-xs text-neutral-400">{selected.size} selected</span>}
      </div>

      {contacts.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-neutral-400">No contacts match. Try clearing filters or add a new contact.</p>
      ) : (
        contacts.map((c) => (
          <ContactRow key={c.id} contact={c} selecting={selecting} selected={selected.has(c.id)} onToggle={() => toggle(c.id)} />
        ))
      )}

      {selecting && selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-40 border-t border-neutral-200 bg-white p-3 shadow-lg md:bottom-0">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2">
            <span className="mr-1 text-sm font-medium text-neutral-700">{selected.size} selected</span>
            <Button size="sm" variant="secondary" onClick={() => setModal("add-tag")}>
              Add tag
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setModal("remove-tag")}>
              Remove tag
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setModal("sequence")}>
              Add to sequence
            </Button>
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
    </div>
  );
}
