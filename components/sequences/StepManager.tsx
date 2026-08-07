"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Textarea, Select, Card, Label } from "@/components/ui";
import { ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";
import type { EmailSequenceStep, SequenceType } from "@/types/database";
import type { StepStats } from "@/lib/data/sequences";

function toDatetimeLocal(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function StepManager({
  sequenceId,
  type,
  steps,
  stats,
}: {
  sequenceId: string;
  type: SequenceType;
  steps: EmailSequenceStep[];
  stats: Map<string, StepStats>;
}) {
  const router = useRouter();
  const sorted = [...steps].sort((a, b) => a.step_order - b.step_order);
  const [adding, setAdding] = useState(false);

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
    const current = sorted[index];
    if (!target) return;
    const supabase = createClient();
    await Promise.all([
      supabase.from("email_sequence_steps").update({ step_order: target.step_order }).eq("id", current.id),
      supabase.from("email_sequence_steps").update({ step_order: current.step_order }).eq("id", target.id),
    ]);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {sorted.map((step, i) => {
        const s = stats.get(step.id);
        return (
          <Card key={step.id} className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <span className="mt-2 shrink-0 text-xs font-medium text-neutral-400">Step {i + 1}</span>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30">
                  <ArrowUp size={14} />
                </button>
                <button onClick={() => move(i, 1)} disabled={i === sorted.length - 1} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30">
                  <ArrowDown size={14} />
                </button>
                <button onClick={() => deleteStep(step.id)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600">
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
                <Label htmlFor={`step-send-at-${step.id}`}>Send at</Label>
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
            {s && s.sent > 0 && (
              <p className="border-t border-neutral-100 pt-2 text-xs text-neutral-400">
                Sent {s.sent} · Opened {s.opened} ({Math.round((s.opened / s.sent) * 100)}%) · Clicked {s.clicked} (
                {Math.round((s.clicked / s.sent) * 100)}%) · Unsubscribed {s.unsubscribed}
              </p>
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
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Email body — use {{first_name}} to personalize" />
        {type === "broadcast" ? (
          <div>
            <Label htmlFor="new-step-send-at">Send at</Label>
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
