import type { Listing, ListingFinancials, ListingOccupancy, ListingOccupancyMonth } from "@/types/database";

export type OccupancyTrendPoint = {
  label: string;
  pct: number;
  occupied: number | null;
  total: number | null;
  inFlight?: boolean;
};

export function parseRoomCount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.round(value);
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.trim());
    if (Number.isFinite(n) && n > 0) return Math.round(n);
  }
  return null;
}

function parseNonNegative(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.trim());
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

function parsePct(value: unknown): number | null {
  const n = parseNonNegative(value);
  if (n == null) return null;
  return Math.max(0, Math.min(100, n));
}

export function parseOccupancyMonth(raw: unknown): ListingOccupancyMonth | null {
  if (raw == null || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const month = typeof row.month === "string" && row.month.trim() ? row.month.trim() : null;
  if (!month) return null;
  const occupancyPct = parsePct(row.occupancy_pct);
  const occupiedNights = parseNonNegative(row.occupied_bed_nights);
  const availableNights = parseNonNegative(row.available_bed_nights);
  const derivedPct =
    occupancyPct == null && availableNights && availableNights > 0 && occupiedNights != null
      ? Math.round((occupiedNights / availableNights) * 1000) / 10
      : occupancyPct;
  if (derivedPct == null) return null;
  return {
    month,
    days_in_month: parseRoomCount(row.days_in_month) ?? undefined,
    occupied_bed_nights: occupiedNights ?? undefined,
    available_bed_nights: availableNights ?? undefined,
    occupancy_pct: derivedPct,
    vacancy_pct: parsePct(row.vacancy_pct) ?? undefined,
    in_flight: row.in_flight === true,
  };
}

export function parseListingOccupancy(raw: unknown): ListingOccupancy | null {
  if (raw == null || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const monthly = Array.isArray(value.monthly)
    ? value.monthly.map(parseOccupancyMonth).filter((row): row is ListingOccupancyMonth => row != null)
    : [];
  const rooms = parseRoomCount(value.rooms);
  const t12 = parsePct(value.t12_occupancy_pct);
  const basis = typeof value.basis === "string" && value.basis.trim() ? value.basis.trim() : undefined;
  if (rooms == null && t12 == null && monthly.length === 0 && !basis) return null;
  return {
    rooms: rooms ?? undefined,
    basis,
    t12_occupancy_pct: t12 ?? undefined,
    monthly,
  };
}

export function occupancyFromFinancials(financials: ListingFinancials | null | undefined): ListingOccupancy | null {
  return parseListingOccupancy(financials?.occupancy);
}

export function occupancyRoomsOverride(listing: Pick<Listing, "financials">): number | null {
  const raw = listing.financials as ListingFinancials | string | null | undefined;
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return parseListingOccupancy(JSON.parse(raw)?.occupancy)?.rooms ?? null;
    } catch {
      return null;
    }
  }
  return occupancyFromFinancials(raw)?.rooms ?? null;
}

// Live PadSplit snapshot only. listed inventory can be smaller than the
// house (Gresham Park Eight: totalRoomsCount 6, bedrooms / occupancy.rooms 8).
export function resolveLiveOccupancy(input: {
  listedOccupied: number | null | undefined;
  listedTotal: number | null | undefined;
  availableCount?: number | null;
  houseBedrooms?: number | null;
  overrideTotal?: number | null;
}): { occupied: number | null; total: number | null; available: number | null } {
  const listedTotal = parseRoomCount(input.listedTotal);
  const listedOccupied =
    input.listedOccupied == null || Number.isNaN(Number(input.listedOccupied))
      ? null
      : Math.max(0, Math.round(Number(input.listedOccupied)));
  const availableFromCount = parseNonNegative(input.availableCount);
  const available =
    availableFromCount != null
      ? Math.round(availableFromCount)
      : listedTotal != null && listedOccupied != null
        ? Math.max(listedTotal - listedOccupied, 0)
        : null;
  const total = parseRoomCount(input.overrideTotal) ?? parseRoomCount(input.houseBedrooms) ?? listedTotal;
  if (total == null) return { occupied: listedOccupied, total: listedTotal, available };
  if (available == null) return { occupied: listedOccupied, total, available };
  return { occupied: Math.max(total - available, 0), total, available };
}

export function listingLiveOccupancy(
  listing: Pick<Listing, "occupied_rooms" | "total_rooms" | "financials" | "beds">,
): { occupied: number | null; total: number | null } {
  return resolveLiveOccupancy({
    listedOccupied: listing.occupied_rooms,
    listedTotal: listing.total_rooms,
    overrideTotal: occupancyRoomsOverride(listing),
    houseBedrooms: listing.beds,
  });
}

const MONTH_KEY = /^(\d{4})-(\d{2})(?:-\d{2})?$/;

export function occupancyMonthDate(month: string): Date | null {
  const iso = month.match(MONTH_KEY);
  if (iso) return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, 1));
  const parsed = new Date(month);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), 1));
}

function emptyT12Frame(now = new Date()): OccupancyTrendPoint[] {
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
  const points: OccupancyTrendPoint[] = [];
  for (let i = 0; i < 12; i++) {
    points.push({
      label: cursor.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
      pct: 0,
      occupied: null,
      total: null,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return points;
}

// Vera workbook / sidecar SoT. PadSplit daily snapshots must never fill this.
export function occupancyTrendFromSidecar(
  occupancy: ListingOccupancy | null | undefined,
  now = new Date(),
): OccupancyTrendPoint[] {
  const points = emptyT12Frame(now);
  const monthly = occupancy?.monthly ?? [];
  if (monthly.length === 0) return points;

  const rooms = occupancy?.rooms ?? null;
  const byKey = new Map<string, ListingOccupancyMonth>();
  for (const row of monthly) {
    const date = occupancyMonthDate(row.month);
    if (!date) continue;
    byKey.set(`${date.getUTCFullYear()}-${date.getUTCMonth()}`, row);
  }

  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
  for (let i = 0; i < 12; i++) {
    const row = byKey.get(`${cursor.getUTCFullYear()}-${cursor.getUTCMonth()}`);
    if (row) {
      const occupied =
        row.occupied_bed_nights != null && row.days_in_month
          ? Math.round(row.occupied_bed_nights / row.days_in_month)
          : rooms != null
            ? Math.round((row.occupancy_pct / 100) * rooms)
            : null;
      points[i] = {
        label: cursor.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
        pct: Math.round(row.occupancy_pct),
        occupied,
        total: rooms,
        inFlight: row.in_flight === true,
      };
    }
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return points;
}

export function occupancyTrendHasSidecarData(points: OccupancyTrendPoint[]): boolean {
  return points.some((point) => point.total != null || point.pct > 0);
}

export function t12OccupancySummary(
  occupancy: ListingOccupancy | null | undefined,
  points: OccupancyTrendPoint[],
): string | null {
  const filled = points.filter((point) => point.total != null || point.pct > 0);
  if (occupancy?.t12_occupancy_pct != null) {
    const low = filled.length > 0 ? Math.min(...filled.map((p) => p.pct)) : Math.round(occupancy.t12_occupancy_pct);
    const rooms = occupancy.rooms;
    const avg = Math.round(occupancy.t12_occupancy_pct * 100) / 100;
    return rooms ? `T12 ${avg}% · low ${low}% · ${rooms} rooms · bed-night` : `T12 ${avg}% · low ${low}% · bed-night`;
  }
  if (filled.length === 0) return null;
  const avg = Math.round(filled.reduce((sum, p) => sum + p.pct, 0) / filled.length);
  const low = Math.min(...filled.map((p) => p.pct));
  const rooms = occupancy?.rooms;
  return rooms ? `T12 ${avg}% · low ${low}% · ${rooms} rooms` : `T12 ${avg}% · low ${low}%`;
}
