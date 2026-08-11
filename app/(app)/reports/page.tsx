import { getLeadSourceReport } from "@/lib/data/reports";
import { LeadSourceReport } from "@/components/reports/LeadSourceReport";

export default async function ReportsPage() {
  const rows = await getLeadSourceReport();

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-neutral-900">Reports</h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          Where your leads actually come from, and which sources turn into closed business.
        </p>
      </div>
      <LeadSourceReport rows={rows} />
    </div>
  );
}
