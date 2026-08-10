"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Select, Textarea, Badge } from "@/components/ui";
import { applyStageChange, type DealModalMode, type PendingDealSummary } from "@/lib/crm/stage-transition";
import { DealCelebrationModal } from "@/components/contacts/DealCelebrationModal";
import { PendingDealCleanupModal } from "@/components/contacts/PendingDealCleanupModal";
import { formatPhone, fullName } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { X, PhoneCall } from "lucide-react";
import type { PipelineStage } from "@/types/database";
import type { DialerContact } from "@/lib/data/dialer";

export function DialerCallModal({
  contact,
  ownerId,
  stages,
  onClose,
}: {
  contact: DialerContact;
  ownerId: string;
  stages: PipelineStage[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [stageId, setStageId] = useState(contact.stage_id ?? "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [called, setCalled] = useState(false);
  const [dealModal, setDealModal] = useState<{ id: string; mode: DealModalMode } | null>(null);
  const [pendingCleanup, setPendingCleanup] = useState<PendingDealSummary[] | null>(null);

  // Fires the instant the call is placed, not on Save - even a call that
  // just rang out or hit voicemail should drop this contact out of the
  // "not yet contacted" group, whether or not any notes get logged after.
  function handleCallNow() {
    setCalled(true);
    const supabase = createClient();
    void supabase.from("activities").insert({
      owner_id: ownerId,
      contact_id: contact.id,
      type: "call",
      direction: "outbound",
      source: "manual",
      body: null,
    });
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();

    if (stageId && stageId !== contact.stage_id) {
      const oldStage = stages.find((s) => s.id === contact.stage_id);
      const newStage = stages.find((s) => s.id === stageId);
      const { error, dealId, dealMode, pendingAtRisk } = await applyStageChange(supabase, ownerId, contact.id, oldStage, newStage);
      if (!error) {
        await supabase.from("activities").insert({
          owner_id: ownerId,
          contact_id: contact.id,
          type: "status_change",
          direction: "none",
          source: "manual",
          body: `Stage changed from ${oldStage?.name ?? "None"} to ${newStage?.name ?? "None"}`,
        });
        if (dealId && dealMode) setDealModal({ id: dealId, mode: dealMode });
        if (pendingAtRisk) setPendingCleanup(pendingAtRisk);
      }
    }

    if (notes.trim()) {
      await supabase.from("activities").insert({
        owner_id: ownerId,
        contact_id: contact.id,
        type: "note",
        direction: "none",
        source: "manual",
        body: notes.trim(),
      });
    }

    setSaving(false);
    if (!dealModal) {
      router.refresh();
      onClose();
    }
  }

  const stage = stages.find((s) => s.id === contact.stage_id);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
        <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-serif text-xl font-semibold text-neutral-900">{fullName(contact)}</p>
              <p className="text-sm text-neutral-500">{formatPhone(contact.phone)}</p>
            </div>
            <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100">
              <X size={18} />
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {stage && <Badge color={stage.color}>{stage.name}</Badge>}
            {contact.lead_source && <Badge className="bg-neutral-100 text-neutral-600">{contact.lead_source}</Badge>}
            {contact.contact_tags.map((ct) => (
              <Badge key={ct.tags.id} color={ct.tags.color}>
                {ct.tags.name}
              </Badge>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-neutral-400">
            {contact.lastCallAt
              ? `Last called ${formatDistanceToNow(new Date(contact.lastCallAt), { addSuffix: true })} · ${contact.callCount} call${contact.callCount === 1 ? "" : "s"} logged`
              : "Not contacted yet"}
          </p>

          <a
            href={`tel:${contact.phone}`}
            onClick={handleCallNow}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3.5 text-base font-semibold text-white hover:bg-red-700 active:scale-[0.98]"
          >
            <PhoneCall size={18} /> Call {contact.first_name} now
          </a>
          {called && <p className="mt-1.5 text-center text-xs text-neutral-400">Logged as a call attempt.</p>}

          <div className="mt-5 space-y-3 border-t border-neutral-100 pt-4">
            <p className="text-xs font-medium text-neutral-500">Reclassify / add notes</p>
            <Select value={stageId} onChange={(e) => setStageId(e.target.value)}>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Textarea
              rows={3}
              placeholder="What did you talk about? What has them interested?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>

      {dealModal && (
        <DealCelebrationModal
          dealId={dealModal.id}
          contactName={fullName(contact)}
          defaultLeadStartedAt={contact.created_at}
          defaultSide={null}
          mode={dealModal.mode ?? "celebrate"}
          onClose={() => {
            setDealModal(null);
            router.refresh();
            onClose();
          }}
        />
      )}
      {pendingCleanup && (
        <PendingDealCleanupModal
          deals={pendingCleanup}
          onClose={() => {
            setPendingCleanup(null);
            router.refresh();
            onClose();
          }}
        />
      )}
    </>
  );
}
