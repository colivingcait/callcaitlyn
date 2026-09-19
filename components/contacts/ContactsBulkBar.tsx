"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { campaignsTextHref } from "@/lib/crm/campaigns-handoff";
import { hasUsablePhone } from "@/lib/crm/contact-filter-predicates";
import { BulkTagModal } from "@/components/contacts/BulkTagModal";
import { BulkStageModal } from "@/components/contacts/BulkStageModal";
import { BulkAddToListModal } from "@/components/contacts/BulkAddToListModal";
import type { ContactSegment, ContactWithRelations, PipelineStage, Tag } from "@/types/database";

type BulkModal = "add-tag" | "remove-tag" | "stage" | "list" | null;

export function ContactsBulkBar({
  selectedIds,
  selectedContacts,
  tags,
  stages,
  segments,
  ownerId,
  onClear,
  compact = false,
}: {
  selectedIds: string[];
  selectedContacts: ContactWithRelations[];
  tags: Tag[];
  stages: PipelineStage[];
  segments: ContactSegment[];
  ownerId: string;
  onClear: () => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<BulkModal>(null);
  const selectedWithPhone = selectedContacts.filter((c) => hasUsablePhone(c.phone)).length;

  function afterAction() {
    setModal(null);
    onClear();
    router.refresh();
  }

  function textSelected() {
    const ids = selectedContacts.filter((c) => hasUsablePhone(c.phone)).map((c) => c.id);
    if (ids.length === 0) return;
    router.push(campaignsTextHref(ids));
  }

  return (
    <>
      <div
        className={
          compact
            ? "fixed inset-x-0 bottom-[var(--app-bottom-nav)] z-40 border-t border-[#eadfd6] bg-[#fffbf8] px-3 py-2.5 lg:hidden"
            : "mb-3 flex flex-wrap items-center gap-2 rounded-[14px] border border-[#eadfd6] bg-[#fffbf8] px-3 py-2.5"
        }
      >
        <div className={compact ? "mx-auto flex max-w-lg flex-wrap items-center gap-2" : "contents"}>
          <span className="text-[14px] font-semibold text-neutral-800">{selectedIds.length} selected</span>
          <button
            type="button"
            onClick={() => setModal("stage")}
            className="rounded-xl border border-[#eadfd6] bg-white px-3 py-1.5 text-[13px] font-semibold text-neutral-800"
          >
            {compact ? "Stage" : "Change stage"}
          </button>
          <button
            type="button"
            onClick={() => setModal("list")}
            className="rounded-xl border border-[#eadfd6] bg-white px-3 py-1.5 text-[13px] font-semibold text-neutral-800"
          >
            {compact ? "List" : "Add to list"}
          </button>
          <button
            type="button"
            onClick={() => setModal("add-tag")}
            className="rounded-xl border border-[#eadfd6] bg-white px-3 py-1.5 text-[13px] font-semibold text-neutral-800"
          >
            {compact ? "Tags" : "Add tags"}
          </button>
          {!compact && (
            <button
              type="button"
              onClick={() => setModal("remove-tag")}
              className="rounded-xl border border-[#eadfd6] bg-white px-3 py-1.5 text-[13px] font-semibold text-neutral-800"
            >
              Remove tags
            </button>
          )}
          <button
            type="button"
            onClick={textSelected}
            disabled={selectedWithPhone === 0}
            className="rounded-xl bg-[#c45c4a] px-3 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            Text
          </button>
          <button type="button" onClick={onClear} className="text-[13px] font-medium text-neutral-500">
            Clear
          </button>
        </div>
      </div>

      {modal === "add-tag" && (
        <BulkTagModal mode="add" tags={tags} contactIds={selectedIds} onClose={() => setModal(null)} onDone={afterAction} />
      )}
      {modal === "remove-tag" && (
        <BulkTagModal mode="remove" tags={tags} contactIds={selectedIds} onClose={() => setModal(null)} onDone={afterAction} />
      )}
      {modal === "stage" && (
        <BulkStageModal contacts={selectedContacts} stages={stages} ownerId={ownerId} onClose={() => setModal(null)} onDone={afterAction} />
      )}
      {modal === "list" && (
        <BulkAddToListModal
          contactIds={selectedIds}
          segments={segments}
          ownerId={ownerId}
          onClose={() => setModal(null)}
          onDone={afterAction}
        />
      )}
    </>
  );
}
