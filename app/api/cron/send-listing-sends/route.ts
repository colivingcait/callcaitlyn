import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processPendingListingSends } from "@/lib/crm/listing-sends";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

const OWNER_ID = process.env.CRM_OWNER_USER_ID;

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!OWNER_ID) return NextResponse.json({ error: "CRM_OWNER_USER_ID not configured" }, { status: 500 });

  const admin = createAdminClient();
  try {
    await processPendingListingSends(admin, OWNER_ID);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Send-listing-sends cron failed", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "send failed" }, { status: 500 });
  }
}
