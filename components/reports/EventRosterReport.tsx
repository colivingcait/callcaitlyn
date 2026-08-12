import { Card } from "@/components/ui";
import { Download } from "lucide-react";
import type { RosterDate } from "@/lib/data/events-report";

const SERIES_LABELS: Record<string, string> = { house_hacking: "House Hacking", womens_rei: "Women's REI" };

function csvField(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function rosterCsvDataUri(roster: RosterDate) {
  const header = ["Name", "Email", "Phone"].map(csvField).join(",");
  const rows = roster.attendees.map((a) => [a.name || "—", a.email ?? "", a.phone ?? ""].map((v) => csvField(v)).join(","));
  const csv = [header, ...rows].join("\r\n");
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
}

export function EventRosterReport({ roster }: { roster: RosterDate[] }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-neutral-700">Attendee roster (most recent 12 events)</h2>
      {roster.length === 0 ? (
        <p className="text-sm text-neutral-500">No Jotform check-ins yet.</p>
      ) : (
        <div className="space-y-3">
          {roster.map((r) => (
            <Card key={`${r.series}:${r.date}`} className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium text-neutral-800">
                  {SERIES_LABELS[r.series] ?? r.series} — {r.date}
                </p>
                <a
                  href={rosterCsvDataUri(r)}
                  download={`${r.series}-${r.date}-attendees.csv`}
                  className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
                >
                  <Download size={13} /> Download CSV
                </a>
              </div>
              <p className="text-xs text-neutral-400">{r.attendees.length} checked in</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600">
                {r.attendees.map((a) => (
                  <span key={a.contactId}>{a.name || "Unnamed"}</span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
