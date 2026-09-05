"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { sendTestEmailDraft } from "@/app/(app)/sequences/actions";
import { applyMergeFields, PREVIEW_CONTACT } from "@/lib/crm/merge-fields";
import { Button, Input, Textarea, Select, Card, Label } from "@/components/ui";
import { EmailBodyEditor } from "@/components/sequences/EmailBodyEditor";
import { AudiencePicker, type AudienceCriteria } from "@/components/sequences/AudiencePicker";
import type { AudiencePreview } from "@/app/(app)/sequences/actions";
import { Plus, Send, Eye, EyeOff } from "lucide-react";
import type { Tag, PipelineStage } from "@/types/database";

type CreateType = "broadcast" | "drip" | "batch";

// Mirrors lib/google/send-email.ts's textToHtml exactly - duplicated
// rather than imported, since that module also pulls in googleapis
// (server-only) which can't ship in a client bundle.
function draftToHtml(text: string) {
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

const EMPTY_CRITERIA: AudienceCriteria = { targetTagIds: [], excludeTagIds: [], excludeStageIds: [], excludeTimelines: [] };

export function CreateSequenceForm({ tags, stages, ownerId }: { tags: Tag[]; stages: PipelineStage[]; ownerId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<CreateType>("broadcast");
  const [criteria, setCriteria] = useState<AudienceCriteria>(EMPTY_CRITERIA);
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
  const [showPreview, setShowPreview] = useState(false);
  const [audience, setAudience] = useState<AudiencePreview | null>(null);

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || criteria.targetTagIds.length === 0) return;
    if (type === "batch") {
      if (!subject.trim() || !body.trim()) return;
      if (sendTiming === "later" && !sendAt) return;
      // A batch email sends the moment it's created (or at the scheduled
      // time, unattended) - unlike broadcast/drip, which only create an
      // empty container here. Block an audience that resolved to nobody
      // (every match opted out, excluded, or missing an email) rather than
      // letting "Create & send" silently create a sequence that sends to
      // no one, and require a real confirmation showing who it's going to
      // before this irreversible send is queued.
      if (!audience || audience.count === 0) {
        setError("Nobody's eligible to receive this - check the audience above before sending.");
        return;
      }
      const when = sendTiming === "now" ? "now" : `at ${new Date(sendAt).toLocaleString()}`;
      const confirmed = window.confirm(
        `Send "${subject.trim()}" to ${audience.count} ${audience.count === 1 ? "person" : "people"} ${when}? This can't be undone.`,
      );
      if (!confirmed) return;
    }
    setSaving(true);
    setError("");
    const supabase = createClient();

    const { data, error: insertError } = await supabase
      .from("email_sequences")
      .insert({
        owner_id: ownerId,
        name: name.trim(),
        description: description.trim() || null,
        type,
        target_tag_ids: criteria.targetTagIds,
        exclude_tag_ids: criteria.excludeTagIds,
        exclude_stage_ids: criteria.excludeStageIds,
        exclude_timelines: criteria.excludeTimelines,
      })
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
        <div>
          <Label htmlFor="seq-type">Type</Label>
          <Select id="seq-type" value={type} onChange={(e) => setType(e.target.value as CreateType)}>
            <option value="broadcast">Sequence (Scheduled Date)</option>
            <option value="drip">Drip</option>
            <option value="batch">Batch Email (one-off)</option>
          </Select>
        </div>
        <p className="text-xs text-neutral-400">
          {type === "broadcast" && "Each step fires on a fixed date/time, to whoever's in the audience below at send time."}
          {type === "drip" && "Each contact starts their own clock the moment they enter the audience below; steps fire at a delay relative to that."}
          {type === "batch" && "One email, sent once, to whoever's in the audience below - no ongoing steps."}
        </p>

        <AudiencePicker
          criteria={criteria}
          onChange={setCriteria}
          tags={tags}
          stages={stages}
          ownerId={ownerId}
          onTagCreated={() => router.refresh()}
          onAudienceChange={setAudience}
        />

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
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={sendTest}
                disabled={testing || !subject.trim() || !body.trim()}
                className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-brand-600 disabled:opacity-50"
              >
                <Send size={13} /> {testing ? "Sending…" : "Send test to myself"}
              </button>
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                disabled={!subject.trim() && !body.trim()}
                className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-brand-600 disabled:opacity-50"
              >
                {showPreview ? <EyeOff size={13} /> : <Eye size={13} />} {showPreview ? "Hide preview" : "Preview email"}
              </button>
              {testResult && <span className={`text-xs ${testResult.ok ? "text-emerald-600" : "text-red-600"}`}>{testResult.message}</span>}
            </div>
            {showPreview && (
              <div className="overflow-hidden rounded-lg border border-neutral-200">
                <div className="border-b border-neutral-100 bg-neutral-50 px-3 py-2 text-[11px] font-medium text-neutral-400">
                  As {PREVIEW_CONTACT.first_name} {PREVIEW_CONTACT.last_name} would see it
                </div>
                <div className="p-4">
                  <p className="mb-2 border-b border-neutral-100 pb-2 text-sm font-semibold text-neutral-900">
                    {applyMergeFields(subject, PREVIEW_CONTACT) || "(no subject)"}
                  </p>
                  {/* eslint-disable-next-line react/no-danger -- her own authored draft, rendered exactly as it will be sent (same textToHtml transform) */}
                  <div
                    className="text-sm leading-relaxed text-neutral-800"
                    dangerouslySetInnerHTML={{ __html: draftToHtml(applyMergeFields(body, PREVIEW_CONTACT)) || "<p class='text-neutral-400'>(empty)</p>" }}
                  />
                </div>
              </div>
            )}
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
              criteria.targetTagIds.length === 0 ||
              (type === "batch" &&
                (!subject.trim() || !body.trim() || (sendTiming === "later" && !sendAt) || !audience || audience.count === 0))
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
