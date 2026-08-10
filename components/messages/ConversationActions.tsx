"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MoreVertical, EyeOff, Eye, Trash2 } from "lucide-react";

// Lets Caitlyn clear spam/trash leads out of her Messages inbox - "Hide"
// just flips the same `archived` flag the rest of the app already treats
// as soft trash, "Delete" removes the contact (and everything attached to
// it, via cascade) for good.
export function ConversationActions({
  contactId,
  hidden,
  afterDelete,
}: {
  contactId: string;
  hidden: boolean;
  afterDelete?: "back-to-messages";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  function close() {
    setOpen(false);
    setConfirmingDelete(false);
  }

  async function toggleHidden(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    const supabase = createClient();
    await supabase.from("contacts").update({ archived: !hidden }).eq("id", contactId);
    setBusy(false);
    close();
    router.refresh();
  }

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    const supabase = createClient();
    await supabase.from("contacts").delete().eq("id", contactId);
    setBusy(false);
    close();
    if (afterDelete === "back-to-messages") router.push("/messages");
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-label="Conversation actions"
        className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100"
      >
        <MoreVertical size={18} />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              close();
            }}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div className="absolute right-0 top-full z-40 mt-1 w-52 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
            {confirmingDelete ? (
              <div className="px-3 py-2">
                <p className="text-xs text-neutral-600">Delete this contact and all their activity? This can&apos;t be undone.</p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={busy}
                    className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
                  >
                    {busy ? "Deleting…" : "Delete"}
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setConfirmingDelete(false);
                    }}
                    className="rounded-lg px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={toggleHidden}
                  disabled={busy}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                >
                  {hidden ? <Eye size={14} /> : <EyeOff size={14} />}
                  {hidden ? "Unhide" : "Hide (spam/trash)"}
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setConfirmingDelete(true);
                  }}
                  disabled={busy}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 size={14} /> Delete contact
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
