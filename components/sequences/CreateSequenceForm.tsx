"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Select, Card, Label } from "@/components/ui";
import { Plus } from "lucide-react";
import type { Tag } from "@/types/database";

export function CreateSequenceForm({ tags, ownerId }: { tags: Tag[]; ownerId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"broadcast" | "drip">("broadcast");
  const [tagId, setTagId] = useState(tags[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus size={15} /> New sequence
      </Button>
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !tagId) return;
    setSaving(true);
    setError("");
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("email_sequences")
      .insert({ owner_id: ownerId, name: name.trim(), type, target_tag_id: tagId })
      .select("id")
      .single();
    setSaving(false);
    if (insertError || !data) {
      setError(insertError?.message ?? "Couldn't create the sequence.");
      return;
    }
    router.push(`/sequences/${data.id}`);
  }

  return (
    <Card className="space-y-3">
      <h2 className="text-sm font-semibold text-neutral-700">New sequence</h2>
      <form onSubmit={handleCreate} className="space-y-3">
        <div>
          <Label htmlFor="seq-name">Name</Label>
          <Input id="seq-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="August meetup reminders" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="seq-type">Type</Label>
            <Select id="seq-type" value={type} onChange={(e) => setType(e.target.value as "broadcast" | "drip")}>
              <option value="broadcast">Scheduled (fixed dates)</option>
              <option value="drip">Drip (interval, per-contact)</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="seq-tag">Target tag</Label>
            <Select id="seq-tag" value={tagId} onChange={(e) => setTagId(e.target.value)}>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <p className="text-xs text-neutral-400">
          {type === "broadcast"
            ? "Each step fires on a fixed date/time, to whoever currently has this tag."
            : "Each contact starts their own clock the moment they get this tag; steps fire at a delay relative to that."}
        </p>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={saving || !name.trim() || !tagId}>
            {saving ? "Creating…" : "Create & add steps"}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
