"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { runBacklogCleanup } from "@/app/(app)/settings/cleanup-actions";
import { Button } from "@/components/ui";

// One-time: Replies owed and Suggested only started filtering out
// closing/low-signal messages going forward - this re-runs that same
// judgment against whatever was already sitting there before, since
// nothing about it happens automatically for old rows.
export function BacklogCleanup() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ repliesCleared: number; insightsCleared: number } | string | null>(null);

  async function run() {
    setRunning(true);
    setResult(null);
    const res = await runBacklogCleanup();
    setRunning(false);
    if (res.ok) {
      setResult({ repliesCleared: res.repliesCleared, insightsCleared: res.insightsCleared });
      router.refresh();
    } else {
      setResult(res.error);
    }
  }

  return (
    <div>
      <p className="text-sm font-semibold text-neutral-700">Clean up the backlog</p>
      <p className="mt-1.5 text-sm leading-5 text-neutral-500">
        Re-checks anything already sitting in Replies owed or Suggested from before those started filtering out
        closing texts and low-signal cards, so the backlog matches the new rules too. Safe to run more than once —
        it only ever touches what hasn&apos;t been evaluated yet.
      </p>
      <div className="mt-3">
        <Button size="sm" variant="secondary" onClick={run} disabled={running}>
          {running ? "Cleaning up…" : "Clean up now"}
        </Button>
      </div>
      {result && (
        <p className="mt-2 text-xs text-neutral-500">
          {typeof result === "string"
            ? result
            : `Cleared ${result.repliesCleared} repl${result.repliesCleared === 1 ? "y" : "ies"} owed, dismissed ${result.insightsCleared} suggested card${result.insightsCleared === 1 ? "" : "s"}.`}
        </p>
      )}
    </div>
  );
}
