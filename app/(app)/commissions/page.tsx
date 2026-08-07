import { listWonDeals } from "@/lib/data/commissions";
import { computeDeals, summarizeDeals, listCapYears, capYearKey } from "@/lib/crm/commission";
import { CommissionTable } from "@/components/commissions/CommissionTable";
import { CommissionStats } from "@/components/commissions/CommissionStats";
import { CapYearToggle } from "@/components/commissions/CapYearToggle";
import { AddPastDealButton } from "@/components/commissions/AddPastDealButton";

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const deals = await listWonDeals();

  // Caps are cumulative across ALL deals in a commission year, so the
  // full set is computed together before filtering down to what's shown -
  // computing only the visible year in isolation would reset the caps
  // incorrectly for years after the first.
  const computed = computeDeals(deals);

  const years = listCapYears(deals);
  const currentYear = params.year && years.includes(params.year) ? params.year : capYearKey(new Date());
  const visible = computed.filter((d) => d.capYear === currentYear);
  const stats = summarizeDeals(visible);

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-neutral-900">Commissions</h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            Auto-filled from your closed deals — KW, KWRI, FMLS, and TC are calculated for you; referral, misc, and
            OZ come from what you entered on each deal.
          </p>
        </div>
        <AddPastDealButton />
      </div>

      <CapYearToggle years={years} current={currentYear} />
      <CommissionStats stats={stats} />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">Deals this commission year</h2>
        <CommissionTable deals={visible} />
      </div>
    </div>
  );
}
