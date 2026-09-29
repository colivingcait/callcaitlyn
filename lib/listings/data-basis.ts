// Operating-expense data basis for an offering memorandum.
// 'actual' is today's behavior. 'projected' means OpEx (and the ratios that
// depend on it) are pending the seller T12. A missing column or an invalid
// value is actual, so a deploy that lands before the migration still renders
// and saves existing OMs.

export type DataBasisOpex = "actual" | "projected";

export const DATA_BASIS_OPEX_COLUMNS = ["data_basis_opex", "data_basis_opex_note"] as const;

export const DEFAULT_PROJECTED_OPEX_NOTE =
  "Operating expenses are projected pending seller T12. Earnings and occupancy are actual PadSplit data.";

// Gated rows that depend on OpEx or on a price that is not in yet.
// Gross rents and net earnings stay unlabeled — those are actual PadSplit figures.
export const PROJECTED_GATED_KEYS = [
  "opex",
  "noi",
  "projected_debt_service",
  "net_cash_flow",
  "cash_on_cash",
  "cap_rate",
  "dscr",
] as const;

export type ProjectedGatedKey = (typeof PROJECTED_GATED_KEYS)[number];

const PROJECTED_GATED_KEY_SET = new Set<string>(PROJECTED_GATED_KEYS);

export function parseDataBasisOpex(value: unknown): DataBasisOpex {
  if (typeof value !== "string") return "actual";
  return value.trim().toLowerCase() === "projected" ? "projected" : "actual";
}

export function isProjectedOpex(value: unknown): boolean {
  return parseDataBasisOpex(value) === "projected";
}

export function parseDataBasisOpexNote(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function projectedOpexNote(note: string | null | undefined): string {
  return parseDataBasisOpexNote(note) ?? DEFAULT_PROJECTED_OPEX_NOTE;
}

export function isProjectedGatedField(key: string, basis: unknown): boolean {
  return isProjectedOpex(basis) && PROJECTED_GATED_KEY_SET.has(key);
}

// Hero cap cell. Actuals keep the current "Unlock" placeholder when the band
// is empty. Projected listings hide cap (and the financials grid already
// drops empty CoC / cap bands) so a null price does not leave a broken cell.
export function showHeroCapRate(basis: unknown, band: string | null | undefined): boolean {
  if (band != null && band.trim() !== "") return true;
  return !isProjectedOpex(basis);
}

export function dataBasisFromSidecar(raw: unknown): { opex: DataBasisOpex; note: string | null } {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return { opex: "actual", note: null };
  }
  const record = raw as Record<string, unknown>;
  return {
    opex: parseDataBasisOpex(record.opex),
    note: parseDataBasisOpexNote(record.opex_note),
  };
}

export type ListingWriteError = { message?: string; code?: string; details?: string | null };

// PostgREST schema-cache miss (PGRST204) or undefined-column (42703).
// Check violations mention the constraint name and must not take this path.
export function isMissingDataBasisColumnError(error: ListingWriteError | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "23514" || error.code === "23502") return false;
  const blob = `${error.message ?? ""} ${error.details ?? ""}`;
  const mentionsColumn = DATA_BASIS_OPEX_COLUMNS.some((column) => blob.includes(column));
  if (!mentionsColumn) return false;
  if (error.code === "PGRST204" || error.code === "42703") return true;
  return /schema cache/i.test(blob) || /does not exist/i.test(blob) || /Could not find the/i.test(blob);
}

export function patchWithoutDataBasisColumns(patch: Record<string, unknown>): Record<string, unknown> {
  const next = { ...patch };
  for (const column of DATA_BASIS_OPEX_COLUMNS) delete next[column];
  return next;
}

export function patchHasDataBasisColumn(patch: Record<string, unknown>): boolean {
  return DATA_BASIS_OPEX_COLUMNS.some((column) => column in patch);
}

// Writes `patch` as-is. If Postgres/PostgREST rejects it because the basis
// columns are not migrated yet, retries without those keys so nickname, bands,
// and financials still save. Callers then read a missing column as actual.
export async function writeListingPatch(
  write: (patch: Record<string, unknown>) => Promise<{ error: ListingWriteError | null }>,
  patch: Record<string, unknown>,
): Promise<{ error: string | null }> {
  const first = await write(patch);
  if (!first.error) return { error: null };
  if (!isMissingDataBasisColumnError(first.error) || !patchHasDataBasisColumn(patch)) {
    return { error: first.error.message || "Could not save" };
  }
  const fallback = patchWithoutDataBasisColumns(patch);
  if (Object.keys(fallback).length === 0) return { error: null };
  const second = await write(fallback);
  if (second.error) return { error: second.error.message || "Could not save" };
  return { error: null };
}
