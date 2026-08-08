"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Select } from "@/components/ui";
import { X } from "lucide-react";

type SequenceOption = { id: string; name: string };

export function BulkSequenceModal({
  sequences,
  contactIds,
  onClose,
  onDone,
}: {
  sequences: SequenceOption[];
  contactIds: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [sequenceId, setSequenceId] = useState(sequences[0]?.id ?? "");
  const [saving, setSaving] = useState(false);

  async function apply() {
    if (!sequenceId) return;
    setSaving(true);
    const supabase = createClient();
    // ignoreDuplicates so an already-enrolled contact isn't reset back to
    // step 1 - this is a backfill tool, not a re-enroll tool.
    await supabase
      .from("email_sequence_enrollments")
      .upsert(
        contactIds.map((contact_id) => ({ sequence_id: sequenceId, contact_id })),
        { onConflict: "sequence_id,contact_id", ignoreDuplicates: true },
      );
    setSaving(false);
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <p className="font-serif text-xl font-semibold text-neutral-900">Add to sequence</p>
          <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>
        {sequences.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">
            No drip sequences yet. Only drip sequences support manual enrollment — a broadcast (scheduled) sequence already sends to
            whoever currently has its target tag, no enrollment needed.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-neutral-500">
              Enrolling {contactIds.length} contact{contactIds.length === 1 ? "" : "s"}. Everyone starts at step 1 — already-enrolled
              contacts are left where they are.
            </p>
            <div className="mt-4">
              <Select value={sequenceId} onChange={(e) => setSequenceId(e.target.value)}>
                {sequences.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="mt-5 flex gap-3">
              <Button onClick={apply} disabled={saving || !sequenceId} className="flex-1">
                {saving ? "Enrolling…" : "Add to sequence"}
              </Button>
              <Button variant="secondary" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
