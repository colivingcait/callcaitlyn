"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { scrapeListingNow } from "@/app/(app)/listings/actions";
import { relativeTime } from "@/lib/format-time";

export function ScrapeNowButton({
  listingId,
  padsplitUrl,
  occupiedRooms,
  totalRooms,
  lastScrapedAt,
  lastScrapeError,
}: {
  listingId: string;
  padsplitUrl: string | null;
  occupiedRooms: number | null;
  totalRooms: number | null;
  lastScrapedAt: string | null;
  lastScrapeError: string | null;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(lastScrapeError);

  async function run() {
    setRunning(true);
    const result = await scrapeListingNow(listingId);
    setRunning(false);
    setError(result.ok ? result.scrapeError : result.error);
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-neutral-800">PadSplit occupancy</p>
        <p className="mt-0.5 text-xs text-neutral-500">
          {occupiedRooms != null && totalRooms != null ? `${occupiedRooms}/${totalRooms} rooms occupied` : "Not scraped yet"}
          {lastScrapedAt && ` · last checked ${relativeTime(lastScrapedAt)}`}
        </p>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
      <button
        type="button"
        onClick={run}
        disabled={running || !padsplitUrl}
        className="shrink-0 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 disabled:opacity-50"
      >
        {running ? "Scraping…" : "Scrape now"}
      </button>
    </div>
  );
}
