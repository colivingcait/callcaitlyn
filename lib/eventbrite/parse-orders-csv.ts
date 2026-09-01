import { fromZonedTime } from "date-fns-tz";
import { splitLine } from "@/lib/crm/bulk-import-contacts";
import { APP_TIMEZONE } from "@/lib/format-time";

// Parses Eventbrite's "Orders" CSV export (Reports > Orders, or the
// multi-event "CrossEvent Orders" export covering several events from one
// account at once) - the one real source of truth this integration has,
// since the live API has never actually returned a usable event start time
// (see lib/eventbrite/client.ts's fetchEventDetails) and the webhook has at
// least one confirmed gap where an entire event's orders never arrived.
// One row per order (one buyer, regardless of ticket quantity - a +1's
// name isn't in this export, only the buyer's, so a 2-ticket order still
// only produces one registration here).
export type ParsedOrderRow = {
  line: number;
  orderId: string;
  orderDate: string; // ISO instant
  buyerFirstName: string | null;
  buyerLastName: string | null;
  buyerEmail: string;
  eventId: string;
  eventName: string;
  eventStart: string; // ISO instant
};

const HEADER_MAP: Record<string, string> = {
  "order id": "orderId",
  "order date": "orderDate",
  "buyer first name": "firstName",
  "buyer last name": "lastName",
  "buyer email": "email",
  "event name": "eventName",
  "event id": "eventId",
  "event start date": "eventStartDate",
  "event start time": "eventStartTime",
  "event timezone": "eventTimezone",
};

function normalizeHeader(h: string) {
  return h.trim().toLowerCase();
}

// Eventbrite reports every date in this export (order date and event start
// alike) as a plain "YYYY-MM-DD HH:MM:SS" wall-clock string in the
// organizer account's own timezone, not UTC - fromZonedTime interprets it
// correctly instead of letting `new Date(...)` silently assume the
// server's zone.
function toIso(dateStr: string, timeStr: string, timezone: string): string | null {
  if (!dateStr) return null;
  const wall = timeStr ? `${dateStr} ${timeStr}` : dateStr;
  const zoned = fromZonedTime(wall, timezone || APP_TIMEZONE);
  return Number.isNaN(zoned.getTime()) ? null : zoned.toISOString();
}

export function parseCrossEventOrdersCsv(text: string): { rows: ParsedOrderRow[]; skipped: number } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { rows: [], skipped: 0 };

  const headerCells = splitLine(lines[0]).map(normalizeHeader);
  const fieldByIndex = headerCells.map((h) => HEADER_MAP[h] ?? null);

  const rows: ParsedOrderRow[] = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    const byField: Record<string, string> = {};
    fieldByIndex.forEach((field, idx) => {
      if (field) byField[field] = (cells[idx] ?? "").trim();
    });

    // Skips the trailing "TOTALS" summary row Eventbrite appends, and any
    // malformed line - both have no real order/event id.
    if (!byField.orderId || !byField.eventId || !byField.email) {
      skipped++;
      continue;
    }

    const timezone = byField.eventTimezone || APP_TIMEZONE;
    const eventStart = toIso(byField.eventStartDate, byField.eventStartTime, timezone);
    const orderDate = toIso(byField.orderDate?.split(" ")[0] ?? "", byField.orderDate?.split(" ")[1] ?? "", timezone);
    if (!eventStart) {
      skipped++;
      continue;
    }

    rows.push({
      line: i + 1,
      orderId: byField.orderId,
      orderDate: orderDate ?? new Date().toISOString(),
      buyerFirstName: byField.firstName || null,
      buyerLastName: byField.lastName || null,
      buyerEmail: byField.email.toLowerCase(),
      eventId: byField.eventId,
      eventName: byField.eventName || "Meetup",
      eventStart,
    });
  }

  return { rows, skipped };
}
