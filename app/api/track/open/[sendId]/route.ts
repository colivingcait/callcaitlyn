import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// 1x1 transparent GIF, served regardless of whether the send row exists so
// a broken/expired tracking pixel never shows as a visible broken image.
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64");

export async function GET(_request: NextRequest, { params }: { params: Promise<{ sendId: string }> }) {
  const { sendId } = await params;
  const admin = createAdminClient();

  const { data: send } = await admin.from("email_sequence_sends").select("open_count, opened_at").eq("id", sendId).maybeSingle();
  if (send) {
    await admin
      .from("email_sequence_sends")
      .update({ opened_at: send.opened_at ?? new Date().toISOString(), open_count: send.open_count + 1 })
      .eq("id", sendId);
  }

  return new NextResponse(PIXEL, {
    headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}
