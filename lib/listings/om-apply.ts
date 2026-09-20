import {
  parseOmSidecarJson,
  planOmSidecarApply,
  type ListingOmSnapshot,
  type OmApplyPatch,
} from "./om-sidecar";

// Postgres uuid text form (any variant). Used to decide whether Apply should
// look up listings.id and STOP, or fall through to public_slug / om_number.
const LISTING_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type OmApplyLookupColumn = "id" | "public_slug" | "om_number";

export type OmApplyLookup = { column: OmApplyLookupColumn; value: string };

export type OmApplyListingRow = ListingOmSnapshot & {
  id: string;
  public_slug: string | null;
  om_number: string | null;
};

export type OmApplyGetBy = (
  column: OmApplyLookupColumn,
  value: string,
) => Promise<{ listing: OmApplyListingRow | null; error?: string }>;

export function isListingUuid(value: string): boolean {
  return LISTING_UUID.test(value.trim());
}

// Marketing already loaded listings.id. Prefer that UUID and do not keep
// searching by slug if the UUID missed — a wrong id must 404. Non-UUID
// keys (legacy public_slug / om_number) are accepted only when no UUID
// was provided.
export function omApplyLookupColumns(key: string): OmApplyLookup[] {
  const value = key.trim();
  if (!value) return [];
  if (isListingUuid(value)) return [{ column: "id", value }];
  return [
    { column: "public_slug", value },
    { column: "om_number", value },
  ];
}

export function snapshotListingForOmApply(row: OmApplyListingRow): ListingOmSnapshot {
  return {
    nickname: row.nickname ?? null,
    om_number: row.om_number ?? null,
    submarket: row.submarket ?? null,
    total_rooms: row.total_rooms ?? null,
    band_gross_rent: row.band_gross_rent ?? null,
    band_expense_load: row.band_expense_load ?? null,
    band_cash_on_cash: row.band_cash_on_cash ?? null,
    band_cap_rate: row.band_cap_rate ?? null,
    financials: row.financials ?? null,
    improvements: row.improvements ?? null,
  };
}

export async function loadListingForOmApply(
  key: string,
  getBy: OmApplyGetBy,
): Promise<{ ok: true; listing: OmApplyListingRow } | { ok: false; error: string }> {
  const lookups = omApplyLookupColumns(key);
  if (lookups.length === 0) return { ok: false, error: "Listing not found" };

  for (const lookup of lookups) {
    const { listing, error } = await getBy(lookup.column, lookup.value);
    if (error) return { ok: false, error };
    if (listing) return { ok: true, listing };
  }
  return { ok: false, error: "Listing not found" };
}

export function omApplyWritePatch(planPatch: OmApplyPatch): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    financials: planPatch.financials,
    updated_at: new Date().toISOString(),
  };
  if (planPatch.nickname !== undefined) patch.nickname = planPatch.nickname;
  if (planPatch.om_number !== undefined) patch.om_number = planPatch.om_number;
  if (planPatch.submarket !== undefined) patch.submarket = planPatch.submarket;
  if (planPatch.total_rooms !== undefined) patch.total_rooms = planPatch.total_rooms;
  if (planPatch.band_gross_rent !== undefined) patch.band_gross_rent = planPatch.band_gross_rent;
  if (planPatch.band_expense_load !== undefined) patch.band_expense_load = planPatch.band_expense_load;
  if (planPatch.band_cash_on_cash !== undefined) patch.band_cash_on_cash = planPatch.band_cash_on_cash;
  if (planPatch.band_cap_rate !== undefined) patch.band_cap_rate = planPatch.band_cap_rate;
  if (planPatch.improvements !== undefined) patch.improvements = planPatch.improvements;
  return patch;
}

export async function planOwnedOmSidecarApply(
  listingKey: string,
  rawJson: string,
  getBy: OmApplyGetBy,
  options: { overwriteHints?: boolean } = {},
): Promise<
  | { ok: true; listingId: string; publicSlug: string | null; patch: Record<string, unknown> }
  | { ok: false; error: string }
> {
  const parsed = parseOmSidecarJson(rawJson);
  if (!parsed.ok) return parsed;

  const loaded = await loadListingForOmApply(listingKey, getBy);
  if (!loaded.ok) return loaded;

  const plan = planOmSidecarApply(parsed.sidecar, snapshotListingForOmApply(loaded.listing), {
    overwriteHints: options.overwriteHints,
  });
  return {
    ok: true,
    listingId: loaded.listing.id,
    publicSlug: loaded.listing.public_slug,
    patch: omApplyWritePatch(plan.patch),
  };
}
