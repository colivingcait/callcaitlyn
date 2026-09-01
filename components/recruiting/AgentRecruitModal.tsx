"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Trash2 } from "lucide-react";
import { Button, Input, Textarea, Label } from "@/components/ui";
import { createAgentRecruit, updateAgentRecruit, deleteAgentRecruit, type AgentRecruitInput } from "@/app/(app)/recruiting/actions";
import type { AgentRecruit } from "@/types/database";

// One modal for both "Add recruit" and editing an existing one - same
// shape as this codebase's other create/edit-in-one-modal forms. Only an
// existing recruit gets a Delete option.
export function AgentRecruitModal({ recruit, onClose }: { recruit?: AgentRecruit; onClose: () => void }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(recruit?.first_name ?? "");
  const [lastName, setLastName] = useState(recruit?.last_name ?? "");
  const [phone, setPhone] = useState(recruit?.phone ?? "");
  const [email, setEmail] = useState(recruit?.email ?? "");
  const [currentBrokerage, setCurrentBrokerage] = useState(recruit?.current_brokerage ?? "");
  const [referralFee, setReferralFee] = useState(recruit?.referral_fee != null ? String(recruit.referral_fee) : "");
  const [notes, setNotes] = useState(recruit?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError("");
    const input: AgentRecruitInput = {
      firstName,
      lastName,
      phone: phone.trim() || null,
      email: email.trim() || null,
      currentBrokerage: currentBrokerage.trim() || null,
      notes: notes.trim() || null,
      referralFee: referralFee.trim() ? Number(referralFee) : null,
    };
    const result = recruit ? await updateAgentRecruit(recruit.id, input) : await createAgentRecruit(input);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
    onClose();
  }

  async function handleDelete() {
    if (!recruit) return;
    setDeleting(true);
    await deleteAgentRecruit(recruit.id);
    setDeleting(false);
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <p className="font-serif text-xl font-semibold text-neutral-900">{recruit ? "Edit recruit" : "Add a recruit"}</p>
          <button onClick={onClose} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>First name</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus />
            </div>
            <div>
              <Label>Last name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phone</Label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Current brokerage</Label>
            <Input value={currentBrokerage} onChange={(e) => setCurrentBrokerage(e.target.value)} placeholder="Where they work now" />
          </div>
          <div>
            <Label>Referral fee</Label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={referralFee}
              onChange={(e) => setReferralFee(e.target.value)}
              placeholder="Fill in once it's agreed"
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center gap-2 pt-1">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "Saving…" : recruit ? "Save" : "Add recruit"}
            </Button>
            {recruit && !confirmingDelete && (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="rounded-[10px] border border-neutral-200 bg-white p-2.5 text-red-600"
                aria-label="Delete recruit"
              >
                <Trash2 size={17} />
              </button>
            )}
          </div>

          {confirmingDelete && (
            <div className="flex items-center gap-2.5 rounded-xl border border-red-100 bg-red-50 p-3">
              <p className="flex-1 text-sm text-red-700">Delete this recruit? This can&apos;t be undone.</p>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-[10px] bg-red-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="rounded-[10px] border border-neutral-200 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-700 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
