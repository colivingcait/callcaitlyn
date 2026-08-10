"use client";

import { useState } from "react";
import { backfillQuoSync } from "@/app/(app)/contacts/actions";
import { Button } from "@/components/ui";

export function QuoSyncBackfill() {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<{ synced: number; failed: number; remaining: number } | null>(null);

  async function run() {
    setRunning(true);
    const result = await backfillQuoSync();
    setRunning(false);
    if (result.ok) setStatus({ synced: result.synced, failed: result.failed, remaining: result.remaining });
  }

  return (
    <div className="space-y-2">
      <Button size="sm" variant="secondary" onClick={run} disabled={running}>
        {running ? "Syncing…" : status ? "Sync more" : "Sync contacts to Quo"}
      </Button>
      {status && (
        <p className="text-xs text-neutral-500">
          Synced {status.synced}
          {status.failed > 0 && `, ${status.failed} failed`}.{" "}
          {status.remaining > 0 ? `${status.remaining} left — click again to continue.` : "All caught up."}
        </p>
      )}
    </div>
  );
}
