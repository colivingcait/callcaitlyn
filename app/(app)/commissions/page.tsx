import { listWonDeals, listPendingDeals } from "@/lib/data/commissions";
import { computeDeals, summarizeDeals, listCapYears, capYearKey } from "@/lib/crm/commission";
import { CommissionTable } from "@/components/commissions/CommissionTable";
import { CommissionStats } from "@/components/commissions/CommissionStats";
import { CapYearToggle } from "@/components/commissions/CapYearToggle";
import { AddPastDealButton } from "@/components/commissions/AddPastDealButton";
import { BulkImportButton } from "@/components/commissions/BulkImportButton";

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const [wonDeals, pendingDeals] = await Promise.all([listWonDeals(), listPendingDeals()]);

  // Won and pending are walked together, in date order, so a pending
  // deal's projected KW/KWRI fee reflects exactly how much cap room prior
  // deals in the same commission year already used - computing only the
  // visible year in isolation, or only won deals, would get this wrong.
  const computed = computeDeals([...wonDeals, ...pendingDeals]);

  const years = listCapYears([...wonDeals, ...pendingDeals]);
  const currentYear = params.year && years.includes(params.year) ? params.year : capYearKey(new Date());
  const visible = computed.filter((d) => d.capYear === currentYear);
  const won = visible.filter((d) => d.status === "won");
  const pending = visible.filter((d) => d.status === "pending");
  const stats = summarizeDeals(won);

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
        <div className="flex shrink-0 gap-2">
          <BulkImportButton />
          <AddPastDealButton />
        </div>
      </div>

      <CapYearToggle years={years} current={currentYear} />
      <CommissionStats stats={stats} pendingKw={pending.reduce((s, d) => s + d.kwFee, 0)} pendingKwri={pending.reduce((s, d) => s + d.kwriFee, 0)} />

      {pending.length > 0 && (
        <div>
          <h2 className="mb-1 text-sm font-semibold text-neutral-700">Under contract (projected)</h2>
          <p className="mb-3 text-xs text-neutral-400">
            Not closed yet — these numbers show what each deal would owe based on cap room used so far, and
            aren&apos;t counted in the totals above until they actually close.
          </p>
          <CommissionTable deals={pending} pending />
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">Deals this commission year</h2>
        <CommissionTable deals={won} />
      </div>
    </div>
  );
}
