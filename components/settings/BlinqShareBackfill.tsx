"use client";

import { useState } from "react";
import { backfillBlinq } from "@/app/(app)/contacts/actions";
import { BackfillRow } from "@/components/settings/BackfillRow";

type Result = Awaited<ReturnType<typeof backfillBlinq>>;

export function BlinqShareBackfill() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function run() {
    setRunning(true);
    const outcome = await backfillBlinq();
    setRunning(false);
    setResult(outcome);
  }

  return (
    <BackfillRow
      description="Search Gmail for Blinq share notifications from before this was set up, and pull those contacts in now."
      running={running}
      onRun={run}
      result={
        result &&
        (result.ok ? (
          <p>
            {result.found} share{result.found === 1 ? "" : "s"} found · {result.added} contact{result.added === 1 ? "" : "s"} added
          </p>
        ) : (
          <p className="text-red-600">{result.error}</p>
        ))
      }
    />
  );
}
