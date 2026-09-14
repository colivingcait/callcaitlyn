"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { addAgentManually } from "@/app/(app)/listings/actions";

export function AddAgentButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [brokerage, setBrokerage] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    const result = await addAgentManually({ name, brokerage: brokerage || undefined, email: email || undefined, phone: phone || undefined });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setName("");
    setBrokerage("");
    setEmail("");
    setPhone("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Plus size={14} /> Add an agent
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="w-full rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-sm sm:rounded-2xl">
        <p className="font-serif text-lg font-semibold text-neutral-900">Add an agent</p>
        <div className="mt-3 space-y-3">
          <div>
            <Label htmlFor="agent-name">Name</Label>
            <Input id="agent-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="agent-brokerage">Brokerage</Label>
            <Input id="agent-brokerage" value={brokerage} onChange={(e) => setBrokerage(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="agent-email">Email</Label>
            <Input id="agent-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="agent-phone">Phone</Label>
            <Input id="agent-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex gap-3">
          <Button onClick={handleSave} disabled={saving || !name.trim()} className="flex-1">
            {saving ? "Adding…" : "Add agent"}
          </Button>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
