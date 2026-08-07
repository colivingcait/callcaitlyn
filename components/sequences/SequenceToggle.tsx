"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { Pause, Play, Trash2 } from "lucide-react";

export function SequenceToggle({ sequenceId, active }: { sequenceId: string; active: boolean }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function toggle() {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("email_sequences").update({ active: !active }).eq("id", sequenceId);
    setSaving(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Delete this sequence? Its steps and send history go with it.")) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("email_sequences").delete().eq("id", sequenceId);
    router.push("/sequences");
  }

  return (
    <div className="flex gap-2">
      <Button variant="secondary" size="sm" onClick={toggle} disabled={saving}>
        {active ? (
          <>
            <Pause size={14} /> Pause
          </>
        ) : (
          <>
            <Play size={14} /> Resume
          </>
        )}
      </Button>
      <Button variant="ghost" size="sm" onClick={handleDelete} disabled={saving}>
        <Trash2 size={14} />
      </Button>
    </div>
  );
}
