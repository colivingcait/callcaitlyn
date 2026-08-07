"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatLocal } from "@/lib/format-time";
import { X } from "lucide-react";
import type { Deal } from "@/types/database";

// Deals are otherwise append-only by design (see stage-transition.ts) so
// a repeat closer's history survives cycling back to active - this is the
// one deliberate escape hatch, for undoing an accidental move into a Win
// stage rather than editing conversion history in general.
export function DealsList({ deals }: { deals: Deal[] }) {
  const router = useRouter();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (deals.length === 0) return null;

  async function handleDelete(id: string) {
    setDeletingId(id);
    const supabase = createClient();
    await supabase.from("deals").delete().eq("id", id);
    setConfirmingId(null);
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="mt-1.5 space-y-1">
      <p className="text-xs font-medium text-neutral-400">Deals closed: {deals.length}</p>
      <ul className="space-y-0.5">
        {deals.map((deal) => (
          <li key={deal.id} className="flex items-center gap-2 text-xs text-neutral-500">
            <span>{formatLocal(deal.closed_at, "MMM d, yyyy")}</span>
            {confirmingId === deal.id ? (
              <span className="flex items-center gap-1.5">
                <span className="text-neutral-400">Remove this deal?</span>
                <button
                  onClick={() => handleDelete(deal.id)}
                  disabled={deletingId === deal.id}
                  className="font-medium text-red-600 hover:underline"
                >
                  {deletingId === deal.id ? "Removing…" : "Confirm"}
                </button>
                <button onClick={() => setConfirmingId(null)} className="text-neutral-400 hover:underline">
                  Cancel
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmingId(deal.id)}
                className="text-neutral-300 hover:text-red-500"
                title="Remove this deal"
              >
                <X size={12} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
