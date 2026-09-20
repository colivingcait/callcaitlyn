import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listWonDeals, listPendingDeals, listUnderContractListings } from "@/lib/data/commissions";
import { computeDeals } from "@/lib/crm/commission";
import { commissionExportFilename, exportCommissionRows, resolveCommissionPeriod, visibleCommissionRows } from "@/lib/crm/commission-period";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const period = resolveCommissionPeriod(request.nextUrl.searchParams.get("period") ?? undefined);
  const [wonDeals, pendingDeals, ucListings] = await Promise.all([listWonDeals(), listPendingDeals(), listUnderContractListings()]);
  const rows = visibleCommissionRows(computeDeals([...wonDeals, ...pendingDeals]), ucListings, period);
  const csv = exportCommissionRows(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${commissionExportFilename(period)}"`,
    },
  });
}
