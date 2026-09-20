import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { asListingFinancials } from "@/lib/listings/crm-marketing-fields";
import { contentDispositionAttachment, verifyWorkbookDownloadToken, workbookDownloadFilename } from "@/lib/listings/workbook-filename";

const OWNER_ID = process.env.CRM_OWNER_USER_ID;

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const token = request.nextUrl.searchParams.get("t") ?? "";
  if (!OWNER_ID || !slug || !verifyWorkbookDownloadToken(slug, token)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: listing } = await admin
    .from("listings")
    .select("id, nickname, financials")
    .eq("owner_id", OWNER_ID)
    .eq("public_slug", slug)
    .maybeSingle();
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: workbook } = await admin
    .from("listing_documents")
    .select("storage_path")
    .eq("listing_id", listing.id)
    .eq("doc_type", "buyer_workbook")
    .maybeSingle();
  if (!workbook?.storage_path) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: file, error } = await admin.storage.from("listing-documents").download(workbook.storage_path);
  if (error || !file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const financials = asListingFinancials(listing.financials);
  const filename = workbookDownloadFilename({
    nickname: listing.nickname,
    storedName: financials?.buyer_workbook_filename ?? null,
    storagePath: workbook.storage_path,
  });
  const buffer = Buffer.from(await file.arrayBuffer());

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": contentDispositionAttachment(filename),
      "Cache-Control": "private, no-store",
    },
  });
}
