"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, MessageSquare, StickyNote, Users, Home, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { Button, Select, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { ActivityType } from "@/types/database";

type ContactOption = { id: string; first_name: string; last_name: string };

const TYPE_TILES: { value: ActivityType; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { value: "call", label: "Call", icon: Phone },
  { value: "text", label: "Text", icon: MessageSquare },
  { value: "note", label: "Note", icon: StickyNote },
  { value: "meeting", label: "Meeting", icon: Users },
  { value: "showing", label: "Showing", icon: Home },
  { value: "email", label: "Email", icon: Mail },
];

// Minimal Phase 1 shell - the Log pill (mobile-only, Today) needs a real
// destination immediately. Extended to the full spec (outcome chips,
// next-follow-up) in Phase 4, backed by logActivityWithOutcome; for now
// this saves the same shape AddActivityForm already does.
export function LogSheet({
  open,
  onClose,
  ownerId,
  contactId: prefilledContactId,
  contactName: prefilledContactName,
}: {
  open: boolean;
  onClose: () => void;
  ownerId: string;
  contactId?: string;
  contactName?: string;
}) {
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactOption[] | null>(null);
  const [contactId, setContactId] = useState(prefilledContactId ?? "");
  const [type, setType] = useState<ActivityType>("call");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || prefilledContactId || contacts) return;
    const supabase = createClient();
    supabase
      .from("contacts")
      .select("id, first_name, last_name")
      .eq("archived", false)
      .order("first_name")
      .then(({ data }) => setContacts((data ?? []) as ContactOption[]));
  }, [open, prefilledContactId, contacts]);

  useEffect(() => {
    if (open) setContactId(prefilledContactId ?? "");
  }, [open, prefilledContactId]);

  async function save() {
    if (!contactId) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("activities").insert({
      owner_id: ownerId,
      contact_id: contactId,
      type,
      direction: "none",
      body: body.trim() || null,
      source: "manual",
    });
    setSaving(false);
    setBody("");
    setType("call");
    router.refresh();
    onClose();
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Log"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="!px-4">
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !contactId} className="flex-1">
            {saving ? "Saving…" : "Save activity"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 pb-4">
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-[.09em] text-neutral-400">Who</p>
          {prefilledContactName ? (
            <p className="text-[17px] font-semibold text-neutral-900">{prefilledContactName}</p>
          ) : (
            <Select value={contactId} onChange={(e) => setContactId(e.target.value)}>
              <option value="">Choose a contact</option>
              {contacts?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                </option>
              ))}
            </Select>
          )}
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-[.09em] text-neutral-400">What happened</p>
          <div className="grid grid-cols-3 gap-2">
            {TYPE_TILES.map((tile) => (
              <button
                key={tile.value}
                type="button"
                onClick={() => setType(tile.value)}
                className={cn(
                  "flex h-[78px] flex-col items-center justify-center gap-1.5 rounded-[14px] border text-[13px] font-medium",
                  type === tile.value ? "border-transparent bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600",
                )}
              >
                <tile.icon size={20} />
                {tile.label}
              </button>
            ))}
          </div>
        </div>
        <Textarea rows={3} placeholder="Notes (optional)" value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
    </BottomSheet>
  );
}
