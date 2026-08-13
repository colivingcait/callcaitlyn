"use client";

import { useState } from "react";
import { backfillEventbriteOrders } from "@/app/(app)/contacts/actions";
import { Button } from "@/components/ui";

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
    <div className="space-y-2">
      <Button size="sm" variant="secondary" onClick={run} disabled={running}>
        {running ? "Syncing…" : "Sync recent Eventbrite registrations"}
      </Button>
      {results && (
        <ul className="space-y-0.5 text-xs text-neutral-500">
          {results.map((r) => (
            <li key={r.label}>
              {r.label}: {r.error ? r.error : `${r.orders} order${r.orders === 1 ? "" : "s"}, ${r.contacts} contact${r.contacts === 1 ? "" : "s"} synced`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
