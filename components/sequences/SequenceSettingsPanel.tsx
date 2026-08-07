"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { duplicateSequence } from "@/app/(app)/sequences/actions";
import { Button, Input, Textarea, Select, Card, Label } from "@/components/ui";
import { Settings, Copy, X } from "lucide-react";
import type { Tag } from "@/types/database";

export function SequenceSettingsPanel({
  sequenceId,
  ownerId,
  name,
  description,
  targetTagId,
  tags,
}: {
  sequenceId: string;
  ownerId: string;
  name: string;
  description: string | null;
  targetTagId: string | null;
  tags: Tag[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tagChoice, setTagChoice] = useState(targetTagId ?? "");
  const [newTagName, setNewTagName] = useState("");
  const [creatingTag, setCreatingTag] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  async function saveField(patch: Record<string, unknown>) {
    const supabase = createClient();
    await supabase.from("email_sequences").update(patch).eq("id", sequenceId);
    router.refresh();
  }

  async function handleTagChange(value: string) {
    if (value === "__new__") {
      setCreatingTag(true);
      return;
    }
    setTagChoice(value);
    await saveField({ target_tag_id: value });
  }

  async function createTagAndAssign() {
    if (!newTagName.trim()) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("tags")
      .insert({ owner_id: ownerId, name: newTagName.trim(), color: "#94a3b8" })
      .select("id")
      .single();
    if (data) {
      setTagChoice(data.id);
      await saveField({ target_tag_id: data.id });
    }
    setNewTagName("");
    setCreatingTag(false);
  }

  async function handleDuplicate() {
    setDuplicating(true);
    const result = await duplicateSequence(sequenceId);
    setDuplicating(false);
    if (result.ok) router.push(`/sequences/${result.id}`);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-lg p-2 text-neutral-400 hover:bg-neutral-100"
        aria-label="Sequence settings"
      >
        <Settings size={18} />
      </button>
    );
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold text-neutral-700">Settings</h2>
        <button onClick={() => setOpen(false)} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100">
          <X size={16} />
        </button>
      </div>
      <div>
        <Label htmlFor="seq-settings-name">Name</Label>
        <Input
          id="seq-settings-name"
          defaultValue={name}
          onBlur={(e) => e.target.value.trim() && e.target.value !== name && saveField({ name: e.target.value.trim() })}
        />
      </div>
      <div>
        <Label htmlFor="seq-settings-desc">Notes (only you see this)</Label>
        <Textarea
          id="seq-settings-desc"
          rows={2}
          defaultValue={description ?? ""}
          placeholder="What this sequence is for, strategy notes, etc."
          onBlur={(e) => e.target.value !== (description ?? "") && saveField({ description: e.target.value || null })}
        />
      </div>
      <div>
        <Label htmlFor="seq-settings-tag">Target tag</Label>
        {creatingTag ? (
          <div className="flex gap-2">
            <Input autoFocus placeholder="New tag name" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} />
            <Button type="button" size="sm" onClick={createTagAndAssign}>
              Add
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setCreatingTag(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Select id="seq-settings-tag" value={tagChoice} onChange={(e) => handleTagChange(e.target.value)}>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
            <option value="__new__">+ Create new tag…</option>
          </Select>
        )}
        <p className="mt-1 text-xs text-neutral-400">
          Changing this changes who gets future sends — it doesn&apos;t move anyone already enrolled.
        </p>
      </div>
      <Button type="button" size="sm" variant="secondary" onClick={handleDuplicate} disabled={duplicating}>
        <Copy size={14} /> {duplicating ? "Duplicating…" : "Duplicate as a new sequence"}
      </Button>
    </Card>
  );
}
