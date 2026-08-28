import { NextResponse, type NextRequest } from "next/server";
import { getEventsData, type RosterPerson } from "@/lib/data/events";
import { formatPhone } from "@/lib/utils";

const HEADERS = ["Event", "Date", "Name", "Email", "Phone", "Registered", "Checked in", "Status", "First time or returning"];

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function csvRow(values: string[]): string {
  return values.map(csvCell).join(",") + "\r\n";
}

function status(p: RosterPerson): string {
  if (p.registered && p.attended) return "Attended";
  if (p.registered && !p.attended) return "No-show";
  return "Walk-in";
}

type StatusFilter = "all" | "registered" | "attended" | "no_show" | "walk_in";

function matchesFilter(p: RosterPerson, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "registered") return p.registered;
  if (filter === "attended") return p.attended;
  if (filter === "no_show") return p.registered && !p.attended;
  return p.attended && !p.registered;
}

export async function GET(request: NextRequest) {
  const eventKey = request.nextUrl.searchParams.get("event");
  const filter = (request.nextUrl.searchParams.get("status") ?? "all") as StatusFilter;

  const { events } = await getEventsData();
  const selected = eventKey ? events.filter((e) => e.key === eventKey) : events;

  let csv = csvRow(HEADERS);
  for (const event of selected) {
    for (const p of event.people.filter((person) => matchesFilter(person, filter))) {
      csv += csvRow([
        event.label,
        event.date.slice(0, 10),
        p.name || "Unnamed",
        p.email ?? "",
        p.phone ? formatPhone(p.phone) : "",
        p.registered ? "Yes" : "No",
        p.attended ? "Yes" : "No",
        status(p),
        p.attendanceNumber > 1 ? "Returning" : "First time",
      ]);
    }
  }

  const filename = eventKey
    ? `${(selected[0]?.label ?? "event").replace(/[^\w-]+/g, "-")}-${filter}.csv`
    : `all-events-roster-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
