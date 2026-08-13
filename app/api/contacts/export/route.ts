import { NextResponse, type NextRequest } from "next/server";
import { listContacts, type ContactSort } from "@/lib/data/contacts";
import { fullName, formatPhone } from "@/lib/utils";

// One field per column, in order - kept deliberately narrow to what an
// email/mailing tool (Eventbrite's own contact list import, Mailchimp,
// etc.) actually wants. Never includes unsubscribe_token or owner_id -
// those are internal, not something that belongs in a downloaded file.
const HEADERS = ["First Name", "Last Name", "Email", "Phone", "Tags", "Stage", "Contact Type", "Lead Source", "Lead Date"];

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function csvRow(values: string[]): string {
  return values.map(csvCell).join(",") + "\r\n";
}

export async function GET(request: NextRequest) {
  // Same query params the Contacts page's filters/segments already use -
  // exporting respects whatever's currently filtered/searched on screen
  // instead of always dumping the entire contact list.
  const params = request.nextUrl.searchParams;

  const contacts = await listContacts({
    q: params.get("q") ?? undefined,
    stageId: params.get("stage") ?? undefined,
    tagId: params.get("tag") ?? undefined,
    type: params.get("type") ?? undefined,
    timeline: params.get("timeline") ?? undefined,
    representing: params.get("representing") ?? undefined,
    leadSource: params.get("source") ?? undefined,
    hasPhone: params.get("phone") === "1",
    missingPhone: params.get("phone") === "0",
    leadDateWithinDays: params.get("newSince") ? Number(params.get("newSince")) : undefined,
    sort: (params.get("sort") as ContactSort | undefined) ?? undefined,
  });

  let csv = csvRow(HEADERS);
  for (const c of contacts) {
    csv += csvRow([
      c.first_name,
      c.last_name ?? "",
      c.email ?? "",
      formatPhone(c.phone),
      c.contact_tags.map((ct) => ct.tags.name).join("; "),
      c.pipeline_stages?.name ?? "",
      c.contact_type,
      c.lead_source ?? "",
      c.lead_date ? c.lead_date.slice(0, 10) : "",
    ]);
  }

  const filename = `contacts-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
