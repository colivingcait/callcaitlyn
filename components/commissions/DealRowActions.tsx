"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DealCelebrationModal } from "@/components/contacts/DealCelebrationModal";
import { fullName } from "@/lib/utils";
import { Pencil, X } from "lucide-react";
import type { Deal } from "@/types/database";

export function DealRowActions({ deal }: { deal: Deal & { contacts?: { first_name: string; last_name: string } | null } }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    const supabase = createClient();
    const { error } = await supabase.from("deals").delete().eq("id", deal.id);
    setDeleting(false);
    if (error) {
      setDeleteError(error.message);
      return;
    }
    router.refresh();
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        {deleteError && <span className="text-red-600">Couldn&apos;t remove: {deleteError}</span>}
        <button onClick={handleDelete} disabled={deleting} className="font-medium text-red-600 hover:underline">
          {deleting ? "Removing…" : "Confirm"}
        </button>
        <button
          onClick={() => {
            setConfirming(false);
            setDeleteError(null);
          }}
          className="text-neutral-400 hover:underline"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      <button onClick={() => setEditing(true)} className="text-neutral-300 hover:text-brand-600" title="Edit this deal">
        <Pencil size={13} />
      </button>
      <button onClick={() => setConfirming(true)} className="text-neutral-300 hover:text-red-500" title="Remove this deal">
        <X size={13} />
      </button>
      {editing && (
        <DealCelebrationModal
          dealId={deal.id}
          contactName={deal.contacts ? fullName(deal.contacts) : deal.client_name ?? "This deal"}
          defaultLeadStartedAt={deal.lead_started_at}
          defaultSide={null}
          initial={deal}
          mode="edit"
          onClose={() => setEditing(false)}
        />
      )}
    </span>
  );
}
