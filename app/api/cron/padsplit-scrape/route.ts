import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { scrapeAllListings } from "@/lib/listings/padsplit-scrape";

const OWNER_ID = process.env.CRM_OWNER_USER_ID;

// Daily refresh of every listing's PadSplit occupancy/pricing/photos, so
// the public listing page stays accurate without her updating it by hand.
export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!OWNER_ID) return NextResponse.json({ error: "CRM_OWNER_USER_ID not configured" }, { status: 500 });

  const admin = createAdminClient();

  try {
    const { scraped, failed } = await scrapeAllListings(admin, OWNER_ID);
    return NextResponse.json({ ok: true, scraped, failed });
  } catch (err) {
    console.error("PadSplit scrape cron failed", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "scrape failed" }, { status: 500 });
  }
}
