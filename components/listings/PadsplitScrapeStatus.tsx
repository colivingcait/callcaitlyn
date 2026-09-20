import { ExternalLink } from "lucide-react";
import { relativeTime } from "@/lib/format-time";

// PadSplit blocks plain server-side requests (including from Vercel's own
// serverless IPs) with a bot-challenge page - scraping it only works from a
// real headless browser, which can't run inline in a Next.js server action.
// Occupancy/pricing/photos are refreshed by a GitHub Actions workflow
// (.github/workflows/refresh-padsplit-listings.yml, twice daily) instead -
// this is a read-only status display, with a link to trigger that workflow
// on demand from GitHub's Actions tab rather than a button that scrapes here.
export function PadsplitScrapeStatus({
  padsplitUrl,
  occupiedRooms,
  totalRooms,
  lastScrapedAt,
  lastScrapeError,
}: {
  padsplitUrl: string | null;
  occupiedRooms: number | null;
  totalRooms: number | null;
  lastScrapedAt: string | null;
  lastScrapeError: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-neutral-800">PadSplit occupancy</p>
        <p className="mt-0.5 text-xs text-neutral-500">
          {occupiedRooms != null && totalRooms != null ? `${occupiedRooms}/${totalRooms} rooms occupied` : "Not scraped yet"}
          {lastScrapedAt && ` · last checked ${relativeTime(lastScrapedAt)}`}
        </p>
        <p className="mt-0.5 text-xs text-neutral-400">Occupancy and pricing refresh twice a day. Public photos stay on the Photos tab.</p>
        {lastScrapeError && <p className="mt-1 text-xs text-red-600">{lastScrapeError}</p>}
      </div>
      {padsplitUrl && (
        <a
          href="https://github.com/colivingcait/callcaitlyn/actions/workflows/refresh-padsplit-listings.yml"
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700"
        >
          Refresh now <ExternalLink size={12} />
        </a>
      )}
    </div>
  );
}
