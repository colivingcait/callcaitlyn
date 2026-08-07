"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { Archive } from "lucide-react";

export function ArchiveButton({ contactId }: { contactId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleArchive() {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("contacts").update({ archived: true }).eq("id", contactId);
    router.push("/contacts");
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-500">Archive this contact?</span>
        <Button variant="danger" size="sm" onClick={handleArchive} disabled={saving}>
          {saving ? "Archiving…" : "Confirm"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
      <Archive size={15} /> Archive
    </Button>
  );
}
