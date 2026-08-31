"use client";

import { useState } from "react";
import { recordManualRate } from "@/app/(app)/settings/rate-actions";
import { Input, Button } from "@/components/ui";
import { formatLocal } from "@/lib/format-time";

export function RateManualEntry({ latestRatePct, latestRateDate }: { latestRatePct: number | null; latestRateDate: string | null }) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    const parsed = Number(value);
    if (!parsed) return;
    setSaving(true);
    const result = await recordManualRate(parsed);
    setSaving(false);
    if (result.ok) {
      setSaved(true);
      setValue("");
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div>
      <p className="text-sm font-semibold text-neutral-700">Today&apos;s 30-year rate</p>
      <p className="mt-1 text-sm text-neutral-500">
        {latestRatePct != null
          ? `On file: ${latestRatePct}% as of ${formatLocal(latestRateDate!, "MMM d")}.`
          : "Nothing on file yet - the rate-move alert on Insights needs at least two entries to compare."}{" "}
        A free FRED API key pulls this automatically (see the README) - otherwise just type it in here whenever it moves.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <Input type="number" step="0.01" placeholder="6.5" value={value} onChange={(e) => setValue(e.target.value)} className="max-w-[120px]" />
        <Button size="sm" onClick={handleSave} disabled={saving || !value}>
          {saving ? "Saving…" : saved ? "Saved" : "Save"}
        </Button>
      </div>
    </div>
  );
}
