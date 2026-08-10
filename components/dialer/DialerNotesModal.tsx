"use client";

import { useState } from "react";
import { saveDialerNotes } from "@/app/(app)/dialer/actions";
import { Button, Select, Textarea } from "@/components/ui";
import { X } from "lucide-react";
import type { PipelineStage } from "@/types/database";

export function DialerNotesModal({
  contactName,
  contactId,
  currentStageId,
  stages,
  onClose,
}: {
  contactName: string;
  contactId: string;
  currentStageId: string | null;
  stages: PipelineStage[];
  onClose: () => void;
}) {
  const [stageId, setStageId] = useState(currentStageId ?? "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await saveDialerNotes(contactId, stageId || null, note);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-serif text-xl font-semibold text-neutral-900">Nice work!</p>
            <p className="text-sm text-neutral-500">Anything to log for {contactName}?</p>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">Stage</label>
            <Select value={stageId} onChange={(e) => setStageId(e.target.value)}>
              <option value="">Leave as-is</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">Notes</label>
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What did they say? What's got them interested?"
            />
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <Button onClick={save} disabled={saving} className="flex-1">
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
}
