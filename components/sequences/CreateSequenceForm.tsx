"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { sendTestEmailDraft } from "@/app/(app)/sequences/actions";
import { Button, Input, Textarea, Select, Card, Label } from "@/components/ui";
import { EmailBodyEditor } from "@/components/sequences/EmailBodyEditor";
import { Plus, Send } from "lucide-react";
import type { Tag } from "@/types/database";

type CreateType = "broadcast" | "drip" | "batch";

export function CreateSequenceForm({ tags, ownerId }: { tags: Tag[]; ownerId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<CreateType>("broadcast");
  const [tagId, setTagId] = useState(tags[0]?.id ?? "");
  const [creatingTag, setCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [creatingTagSaving, setCreatingTagSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Batch-only fields - a batch email is just a broadcast sequence with
  // one step, created in a single combined step instead of the usual
  // "create the sequence, then separately add a step" flow.
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sendTiming, setSendTiming] = useState<"now" | "later">("now");
  const [sendAt, setSendAt] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function sendTest() {
    setTesting(true);
    setTestResult(null);
    const result = await sendTestEmailDraft(subject, body);
    setTesting(false);
    setTestResult({ ok: result.ok, message: result.ok ? "Sent to your inbox" : result.error });
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus size={15} /> New email
      </Button>
    );
  }

  async function createTag() {
    if (!newTagName.trim()) return;
    setCreatingTagSaving(true);
    const supabase = createClient();
    const { data } = await supabase.from("tags").insert({ owner_id: ownerId, name: newTagName.trim(), color: "#94a3b8" }).select("id").single();
    setCreatingTagSaving(false);
    if (data) {
      setTagId(data.id);
      setNewTagName("");
      setCreatingTag(false);
      router.refresh();
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !tagId) return;
    if (type === "batch") {
      if (!subject.trim() || !body.trim()) return;
      if (sendTiming === "later" && !sendAt) return;
    }
    setSaving(true);
    setError("");
    const supabase = createClient();

    const { data, error: insertError } = await supabase
      .from("email_sequences")
      .insert({ owner_id: ownerId, name: name.trim(), description: description.trim() || null, type, target_tag_id: tagId })
      .select("id")
      .single();

    if (insertError || !data) {
      setSaving(false);
      setError(insertError?.message ?? "Couldn't create the email.");
      return;
    }

    if (type === "batch") {
      const { error: stepError } = await supabase.from("email_sequence_steps").insert({
        sequence_id: data.id,
        step_order: 0,
        subject: subject.trim(),
        body: body.trim(),
        send_at: sendTiming === "now" ? new Date().toISOString() : new Date(sendAt).toISOString(),
      });
      if (stepError) {
        setSaving(false);
        setError(stepError.message);
        return;
      }
    }

    setSaving(false);
    router.push(`/sequences/${data.id}`);
  }

  return (
    <Card className="space-y-3">
      <h2 className="text-sm font-semibold text-neutral-700">New email</h2>
      <form onSubmit={handleCreate} className="space-y-3">
        <div>
          <Label htmlFor="seq-name">Name</Label>
          <Input id="seq-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="August meetup reminders" />
        </div>
        <div>
          <Label htmlFor="seq-desc">Notes (optional, only you see this)</Label>
          <Textarea
            id="seq-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this is for, strategy notes, etc."
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="seq-type">Type</Label>
            <Select id="seq-type" value={type} onChange={(e) => setType(e.target.value as CreateType)}>
              <option value="broadcast">Sequence (Scheduled Date)</option>
              <option value="drip">Drip</option>
              <option value="batch">Batch Email (one-off)</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="seq-tag">Target tag</Label>
            {creatingTag ? (
              <div className="flex gap-1.5">
                <Input autoFocus placeholder="New tag" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} />
                <Button type="button" size="sm" onClick={createTag} disabled={creatingTagSaving}>
                  Add
                </Button>
              </div>
            ) : (
              <Select
                id="seq-tag"
                value={tagId}
                onChange={(e) => (e.target.value === "__new__" ? setCreatingTag(true) : setTagId(e.target.value))}
              >
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
                <option value="__new__">+ Create new tag…</option>
              </Select>
            )}
          </div>
        </div>
        <p className="text-xs text-neutral-400">
          {type === "broadcast" && "Each step fires on a fixed date/time, to whoever currently has this tag."}
          {type === "drip" && "Each contact starts their own clock the moment they get this tag; steps fire at a delay relative to that."}
          {type === "batch" && "One email, sent once, to whoever currently has this tag - no ongoing steps."}
        </p>

        {type === "batch" && (
          <div className="space-y-3 border-t border-neutral-100 pt-3">
            <div>
              <Label htmlFor="batch-subject">Subject</Label>
              <Input id="batch-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
            </div>
            <div>
              <Label htmlFor="batch-body">Body</Label>
              <EmailBodyEditor value={body} onChange={setBody} rows={5} placeholder="Email body — use {{first_name}} to personalize" />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={sendTest}
                disabled={testing || !subject.trim() || !body.trim()}
                className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-brand-600 disabled:opacity-50"
              >
                <Send size={13} /> {testing ? "Sending…" : "Send test to myself"}
              </button>
              {testResult && <span className={`text-xs ${testResult.ok ? "text-emerald-600" : "text-red-600"}`}>{testResult.message}</span>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="batch-timing">Send</Label>
                <Select id="batch-timing" value={sendTiming} onChange={(e) => setSendTiming(e.target.value as "now" | "later")}>
                  <option value="now">Now (within ~15 min)</option>
                  <option value="later">Schedule for later</option>
                </Select>
              </div>
              {sendTiming === "later" && (
                <div>
                  <Label htmlFor="batch-send-at">Send at (Eastern time)</Label>
                  <Input id="batch-send-at" type="datetime-local" value={sendAt} onChange={(e) => setSendAt(e.target.value)} />
                </div>
              )}
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button
            type="submit"
            size="sm"
            disabled={
              saving ||
              !name.trim() ||
              !tagId ||
              (type === "batch" && (!subject.trim() || !body.trim() || (sendTiming === "later" && !sendAt)))
            }
          >
            {saving ? "Creating…" : type === "batch" ? "Create & send" : "Create & add steps"}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
