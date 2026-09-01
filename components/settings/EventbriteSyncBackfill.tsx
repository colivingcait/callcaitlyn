"use client";

import { useState } from "react";
import { backfillEventbriteOrders } from "@/app/(app)/contacts/actions";
import { BackfillRow } from "@/components/settings/BackfillRow";

type Result = { label: string; orders: number; contacts: number; error?: string };

export function EventbriteSyncBackfill() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);

  async function run() {
    setRunning(true);
    const result = await backfillEventbriteOrders();
    setRunning(false);
    if (result.ok) setResults(result.results);
  }

  return (
    <BackfillRow
      description="Pull the last 90 days of Eventbrite orders from both accounts. Existing contacts get matched, not duplicated."
      running={running}
      onRun={run}
      result={
        results && (
          <ul className="space-y-0.5">
            {results.map((r) => (
              <li key={r.label}>
                {r.label}: {r.error ? r.error : `${r.orders} order${r.orders === 1 ? "" : "s"}, ${r.contacts} contact${r.contacts === 1 ? "" : "s"} synced`}
              </li>
            ))}
          </ul>
        )
      }
    />
  );
}
