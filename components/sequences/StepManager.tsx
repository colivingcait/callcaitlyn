"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { sendTestStepEmail } from "@/app/(app)/sequences/actions";
import { Button, Input, Textarea, Select, Card, Label, Badge } from "@/components/ui";
import { RateBar } from "@/components/sequences/RateBar";
import { formatLocal } from "@/lib/format-time";
import { fullName, shortenUrl } from "@/lib/utils";
import { ArrowUp, ArrowDown, Trash2, Plus, Pause, Play, Send } from "lucide-react";
import type { EmailSequenceStep, SequenceType } from "@/types/database";
import type { StepStats, LinkClickBreakdown } from "@/lib/data/sequences";

function toDatetimeLocal(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function StatusChip({ step, type }: { step: EmailSequenceStep; type: SequenceType }) {
  if (!step.active) return <Badge className="bg-neutral-100 text-neutral-500">Paused</Badge>;
  if (type !== "broadcast") return null;
  if (!step.send_at) return null;
  const isFuture = new Date(step.send_at).getTime() > Date.now();
  return isFuture ? (
    <Badge className="bg-brand-50 text-brand-700">Scheduled</Badge>
  ) : (
    <Badge className="bg-emerald-50 text-emerald-700">Sent</Badge>
  );
}

// Reordering N items by swapping step_order values can transiently collide
// with the unique(sequence_id, step_order) constraint depending on request
// timing. Moving everything to guaranteed-unused negative placeholders
// first, then assigning final positions, avoids that regardless of how the
// requests interleave.
async function persistOrder(steps: EmailSequenceStep[]) {
  const supabase = createClient();
  await Promise.all(steps.map((step, i) => supabase.from("email_sequence_steps").update({ step_order: -(i + 1) }).eq("id", step.id)));
  await Promise.all(steps.map((step, i) => supabase.from("email_sequence_steps").update({ step_order: i }).eq("id", step.id)));
}

export function StepManager({
  sequenceId,
  type,
  steps,
  stats,
  linkBreakdown,
}: {
  sequenceId: string;
  type: SequenceType;
  steps: EmailSequenceStep[];
  stats: Map<string, StepStats>;
  linkBreakdown: Map<string, LinkClickBreakdown[]>;
}) {
  const router = useRouter();
  const sorted = [...steps].sort((a, b) => a.step_order - b.step_order);
  const [adding, setAdding] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; message: string } | null>(null);

  async function updateStep(id: string, patch: Record<string, unknown>) {
    const supabase = createClient();
    await supabase.from("email_sequence_steps").update(patch).eq("id", id);
    router.refresh();
  }

  async function deleteStep(id: string) {
    if (!confirm("Delete this step? Its send history/tracking stays on record, but it'll never send again.")) return;
    const supabase = createClient();
    await supabase.from("email_sequence_steps").delete().eq("id", id);
    router.refresh();
  }

  async function move(index: number, direction: -1 | 1) {
    const target = sorted[index + direction];
    if (!target) return;
    const reordered = [...sorted];
    [reordered[index], reordered[index + direction]] = [reordered[index + direction], reordered[index]];
    await persistOrder(reordered);
    router.refresh();
  }

  async function sendTest(id: string) {
    setTestingId(id);
    setTestResult(null);
    const result = await sendTestStepEmail(id);
    setTestingId(null);
    setTestResult({ id, ok: result.ok, message: result.ok ? "Sent to your inbox" : result.error });
  }

  return (
    <div className="space-y-3">
      {sorted.map((step, i) => {
        const s = stats.get(step.id);
        const links = linkBreakdown.get(step.id) ?? [];
        return (
          <Card key={step.id} className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="mt-1 flex items-center gap-2">
                <span className="shrink-0 text-xs font-medium text-neutral-400">Step {i + 1}</span>
                <StatusChip step={step} type={type} />
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => updateStep(step.id, { active: !step.active })}
                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100"
                  aria-label={step.active ? "Pause this step" : "Resume this step"}
                  title={step.active ? "Pause this step" : "Resume this step"}
                >
                  {step.active ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === sorted.length - 1}
                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  onClick={() => deleteStep(step.id)}
                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Delete step"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <Input
              defaultValue={step.subject}
              placeholder="Subject"
              onBlur={(e) => e.target.value !== step.subject && updateStep(step.id, { subject: e.target.value })}
            />
            <Textarea
              defaultValue={step.body}
              rows={3}
              placeholder="Email body — use {{first_name}} to personalize"
              onBlur={(e) => e.target.value !== step.body && updateStep(step.id, { body: e.target.value })}
            />
            {type === "broadcast" ? (
              <div>
                <Label htmlFor={`step-send-at-${step.id}`}>Send at (Eastern time)</Label>
                <Input
                  id={`step-send-at-${step.id}`}
                  type="datetime-local"
                  defaultValue={toDatetimeLocal(step.send_at)}
                  onBlur={(e) => e.target.value && updateStep(step.id, { send_at: new Date(e.target.value).toISOString() })}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor={`step-delay-${step.id}`}>Delay {i === 0 ? "after joining" : "after previous step"}</Label>
                  <Input
                    id={`step-delay-${step.id}`}
                    type="number"
                    min={0}
                    defaultValue={step.delay_amount ?? 0}
                    onBlur={(e) => updateStep(step.id, { delay_amount: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor={`step-delay-unit-${step.id}`}>Unit</Label>
                  <Select
                    id={`step-delay-unit-${step.id}`}
                    defaultValue={step.delay_unit ?? "days"}
                    onChange={(e) => updateStep(step.id, { delay_unit: e.target.value })}
                  >
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </Select>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 border-t border-neutral-100 pt-2">
              <button
                onClick={() => sendTest(step.id)}
                disabled={testingId === step.id}
                className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-brand-600 disabled:opacity-50"
              >
                <Send size={13} /> {testingId === step.id ? "Sending…" : "Send test to myself"}
              </button>
              {testResult?.id === step.id && (
                <span className={`text-xs ${testResult.ok ? "text-emerald-600" : "text-red-600"}`}>{testResult.message}</span>
              )}
            </div>

            {s && s.sent > 0 && (
              <div className="grid grid-cols-3 gap-3 border-t border-neutral-100 pt-2">
                <RateBar label="Opened" count={s.opened} total={s.sent} color="bg-brand-500" />
                <RateBar label="Clicked" count={s.clicked} total={s.sent} color="bg-emerald-500" />
                <RateBar label="Unsubscribed" count={s.unsubscribed} total={s.sent} color="bg-red-400" />
              </div>
            )}
            {s && s.sent > 0 && type === "broadcast" && step.send_at && (
              <p className="text-[10px] text-neutral-400">Sent {formatLocal(step.send_at, "MMM d, h:mm a")}</p>
            )}

            {links.length > 0 && (
              <div className="space-y-1.5 border-t border-neutral-100 pt-2">
                <p className="text-xs font-medium text-neutral-500">Link clicks</p>
                {links.map((l) => (
                  <div key={l.url}>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-w-0 flex-1 truncate text-brand-600 hover:underline"
                      >
                        {shortenUrl(l.url)}
                      </a>
                      <span className="shrink-0 text-neutral-400">{l.count}×</span>
                    </div>
                    {l.contacts.length > 0 && (
                      <p className="mt-0.5 truncate text-[11px] text-neutral-400">
                        {l.contacts.map((c) => fullName(c)).join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}

      {adding ? (
        <NewStepForm
          sequenceId={sequenceId}
          type={type}
          nextOrder={(sorted.at(-1)?.step_order ?? -1) + 1}
          onDone={() => {
            setAdding(false);
            router.refresh();
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
          <Plus size={14} /> Add step
        </Button>
      )}
    </div>
  );
}

function NewStepForm({
  sequenceId,
  type,
  nextOrder,
  onDone,
  onCancel,
}: {
  sequenceId: string;
  type: SequenceType;
  nextOrder: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sendAt, setSendAt] = useState("");
  const [delayAmount, setDelayAmount] = useState("1");
  const [delayUnit, setDelayUnit] = useState<"hours" | "days">("days");
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;
    if (type === "broadcast" && !sendAt) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("email_sequence_steps").insert({
      sequence_id: sequenceId,
      step_order: nextOrder,
      subject: subject.trim(),
      body: body.trim(),
      send_at: type === "broadcast" ? new Date(sendAt).toISOString() : null,
      delay_amount: type === "drip" ? Number(delayAmount) : null,
      delay_unit: type === "drip" ? delayUnit : null,
    });
    setSaving(false);
    onDone();
  }

  return (
    <Card className="space-y-2">
      <form onSubmit={handleAdd} className="space-y-2">
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Email body — use {{first_name}} to personalize"
        />
        {body && (
          <p className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
            Preview: {body.replace(/\{\{\s*first_name\s*\}\}/gi, "Jamie").replace(/\{\{\s*last_name\s*\}\}/gi, "Example")}
          </p>
        )}
        {type === "broadcast" ? (
          <div>
            <Label htmlFor="new-step-send-at">Send at (Eastern time)</Label>
            <Input id="new-step-send-at" type="datetime-local" value={sendAt} onChange={(e) => setSendAt(e.target.value)} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="new-step-delay">Delay</Label>
              <Input id="new-step-delay" type="number" min={0} value={delayAmount} onChange={(e) => setDelayAmount(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="new-step-delay-unit">Unit</Label>
              <Select id="new-step-delay-unit" value={delayUnit} onChange={(e) => setDelayUnit(e.target.value as "hours" | "days")}>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </Select>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={saving || !subject.trim() || !body.trim()}>
            {saving ? "Adding…" : "Add step"}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
