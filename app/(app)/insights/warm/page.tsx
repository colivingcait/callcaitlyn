import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getWarmRanking } from "@/lib/data/warm";
import { WarmRow } from "@/components/insights/WarmRow";

export default async function WarmRightNowPage() {
  const ranked = await getWarmRanking();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link href="/insights" className="flex items-center gap-1 text-sm font-medium text-neutral-500">
        <ChevronLeft size={15} /> Insights
      </Link>
      <h1 className="mt-2 font-serif text-2xl font-semibold text-neutral-900 sm:text-[28px]">Warm right now</h1>
      <p className="mt-1 text-[15px] text-neutral-500">
        Ranked by recency and burst, not raw volume - someone quiet for months who suddenly clicks twice this week ranks higher than a steady
        reader who opens everything every week.
      </p>

      <div className="mt-5 overflow-hidden rounded-2xl border border-[#ebe9e7] bg-white">
        {ranked.length === 0 ? (
          <p className="px-4 py-6 text-[15px] text-neutral-400">No email activity in the last 7 days.</p>
        ) : (
          ranked.map((c, i) => <WarmRow key={c.contactId} contact={c} defaultOpen={i === 0} />)
        )}
      </div>
    </div>
  );
}
