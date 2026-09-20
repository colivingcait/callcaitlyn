import { z } from "zod";
import type { ListingFinancials, ListingImprovement } from "@/types/database";
import { normalizeFinancials } from "@/lib/listings/crm-marketing-fields";

export const OM_SIDECAR_SCHEMA_VERSION = 1;

const stringish = z.union([z.string(), z.number()]).transform((value) => String(value));
const optionalStringish = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((value) => (value == null ? undefined : String(value)));

const t12LineSchema = z
  .object({
    label: z.string(),
    value: stringish,
    subtotal: z.boolean().optional(),
  })
  .passthrough();

const scenarioSchema = z
  .object({
    label: z.string(),
    coc: stringish,
    cash_in: stringish,
    debt_service: stringish,
    cash_flow: stringish,
    dscr: optionalStringish,
    loan_amount: optionalStringish,
  })
  .passthrough();

const improvementSchema = z
  .object({
    item: z.string().optional().default(""),
    year: z.union([z.string(), z.number()]).optional().transform((value) => (value == null ? "" : String(value))),
    cost: z.union([z.string(), z.number()]).optional().transform((value) => (value == null ? "" : String(value))),
  })
  .passthrough();

const listingHintsSchema = z
  .object({
    nickname: z.string().optional(),
    om_number: z.string().optional(),
    submarket: z.string().optional(),
    rooms: z.union([z.number(), z.string()]).optional(),
  })
  .passthrough();

const publicBandsSchema = z
  .object({
    band_gross_rent: z.string().optional(),
    band_expense_load: z.string().optional(),
    band_cash_on_cash: z.string().optional(),
    band_cap_rate: z.string().optional(),
  })
  .passthrough();

const financialsSchema = z
  .object({
    t12: z.array(t12LineSchema).optional(),
    noi: optionalStringish,
    cap_rate: optionalStringish,
    vacancy_pct: optionalStringish,
    occupancy_summary: z.string().optional(),
    platform_fees: optionalStringish,
    padsplit_fees: optionalStringish,
    pm_fees: optionalStringish,
    expense_load_pct: optionalStringish,
    dscr: optionalStringish,
    purchase_price: optionalStringish,
    gross_rents: optionalStringish,
    net_earnings: optionalStringish,
    opex: optionalStringish,
    projected_debt_service: optionalStringish,
    cash_on_cash: optionalStringish,
    scenarios: z.array(scenarioSchema).optional(),
  })
  .passthrough();

export const omSidecarV1Schema = z
  .object({
    schema_version: z.union([z.literal(1), z.literal("1")]),
    deal_key: z.string().optional(),
    listing_hints: listingHintsSchema.optional(),
    public_bands: publicBandsSchema.optional(),
    financials: financialsSchema,
    improvements: z.array(improvementSchema).optional(),
    documents: z
      .object({
        buyer_workbook: z.string().optional(),
      })
      .passthrough()
      .optional(),
    meta: z.unknown().optional(),
  })
  .passthrough();

export type OmSidecarV1 = z.output<typeof omSidecarV1Schema>;

export type OmSidecarParseOk = { ok: true; sidecar: OmSidecarV1 };
export type OmSidecarParseErr = { ok: false; error: string };
export type OmSidecarParseResult = OmSidecarParseOk | OmSidecarParseErr;

export type ListingOmSnapshot = {
  nickname: string | null;
  om_number: string | null;
  submarket: string | null;
  total_rooms: number | null;
  band_gross_rent: string | null;
  band_expense_load: string | null;
  band_cash_on_cash: string | null;
  band_cap_rate: string | null;
  financials: ListingFinancials | null;
  improvements: ListingImprovement[] | null;
};

export type OmApplyChangeGroup = "bands" | "financials" | "hints" | "improvements" | "documents";

export type OmApplyChange = {
  path: string;
  label: string;
  before: string;
  after: string;
  group: OmApplyChangeGroup;
  overwriteProtected?: boolean;
};

export type OmApplyPatch = {
  nickname?: string | null;
  om_number?: string | null;
  submarket?: string | null;
  total_rooms?: number | null;
  band_gross_rent?: string | null;
  band_expense_load?: string | null;
  band_cash_on_cash?: string | null;
  band_cap_rate?: string | null;
  financials: ListingFinancials;
  improvements?: ListingImprovement[] | null;
};

export type OmApplyPlan = {
  dealKey: string | null;
  buyerWorkbookHint: string | null;
  changes: OmApplyChange[];
  patch: OmApplyPatch;
  protectedCount: number;
};

function isBlank(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return false;
}

function displayValue(value: unknown): string {
  if (value == null || value === "") return "(empty)";
  if (Array.isArray(value)) {
    if (value.length === 0) return "(empty)";
    if (value.every((row) => row && typeof row === "object" && "label" in row)) {
      return `${value.length} line${value.length === 1 ? "" : "s"}`;
    }
    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function parseSchemaVersion(raw: unknown): { major: number; raw: unknown } | { error: string } {
  if (raw == null || raw === "") return { error: "Missing schema_version." };
  if (typeof raw === "number" && Number.isFinite(raw)) return { major: Math.trunc(raw), raw };
  if (typeof raw === "string") {
    const major = Number(raw.trim().split(".")[0]);
    if (Number.isFinite(major)) return { major, raw };
  }
  return { error: `Invalid schema_version ${JSON.stringify(raw)}.` };
}

export function parseOmSidecar(input: unknown): OmSidecarParseResult {
  if (input == null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Sidecar must be a JSON object." };
  }
  const version = parseSchemaVersion((input as { schema_version?: unknown }).schema_version);
  if ("error" in version) return { ok: false, error: version.error };
  if (version.major !== OM_SIDECAR_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Unsupported sidecar schema_version ${String(version.raw)}. This CRM accepts version ${OM_SIDECAR_SCHEMA_VERSION}.`,
    };
  }
  const parsed = omSidecarV1Schema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = first?.path?.length ? first.path.join(".") : "sidecar";
    return { ok: false, error: `${path}: ${first?.message ?? "Invalid sidecar."}` };
  }
  return { ok: true, sidecar: parsed.data };
}

export function parseOmSidecarJson(raw: string): OmSidecarParseResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: "Paste or upload a sidecar JSON file." };
  try {
    return parseOmSidecar(JSON.parse(trimmed));
  } catch {
    return { ok: false, error: "Invalid JSON." };
  }
}

function parseRooms(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.trunc(n);
}

function sameText(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? "") === (b ?? "");
}

function mergeFinancials(existing: ListingFinancials | null | undefined, sidecar: OmSidecarV1): ListingFinancials {
  const incoming = sidecar.financials as Record<string, unknown>;
  const base = existing ? ({ ...existing } as Record<string, unknown>) : {};
  const merged = {
    ...base,
    ...incoming,
    t12: Array.isArray(incoming.t12) ? incoming.t12 : Array.isArray(base.t12) ? base.t12 : [],
    noi: incoming.noi ?? base.noi ?? "",
    cap_rate: incoming.cap_rate ?? base.cap_rate ?? "",
    vacancy_pct: incoming.vacancy_pct ?? base.vacancy_pct ?? "",
    occupancy_summary: incoming.occupancy_summary ?? base.occupancy_summary ?? "",
    platform_fees: incoming.platform_fees ?? base.platform_fees ?? "",
    padsplit_fees: incoming.padsplit_fees ?? incoming.platform_fees ?? base.padsplit_fees ?? base.platform_fees ?? "",
    pm_fees: incoming.pm_fees ?? base.pm_fees ?? "",
    expense_load_pct: incoming.expense_load_pct ?? base.expense_load_pct ?? "",
    dscr: incoming.dscr ?? base.dscr ?? "",
    purchase_price: incoming.purchase_price ?? base.purchase_price ?? "",
    gross_rents: incoming.gross_rents ?? base.gross_rents ?? "",
    net_earnings: incoming.net_earnings ?? base.net_earnings ?? "",
    opex: incoming.opex ?? base.opex ?? "",
    projected_debt_service: incoming.projected_debt_service ?? base.projected_debt_service ?? "",
    cash_on_cash: incoming.cash_on_cash ?? base.cash_on_cash ?? "",
    scenarios: Array.isArray(incoming.scenarios) ? incoming.scenarios : Array.isArray(base.scenarios) ? base.scenarios : [],
  } as ListingFinancials;

  if (sidecar.meta !== undefined) merged.meta = sidecar.meta;
  else if (incoming.meta !== undefined) merged.meta = incoming.meta;
  if (sidecar.deal_key) merged.deal_key = sidecar.deal_key;
  if (sidecar.documents?.buyer_workbook) merged.buyer_workbook_filename = sidecar.documents.buyer_workbook;

  return normalizeFinancials(merged);
}

export function planOmSidecarApply(sidecar: OmSidecarV1, current: ListingOmSnapshot, options: { overwriteHints?: boolean } = {}): OmApplyPlan {
  const overwriteHints = options.overwriteHints === true;
  const changes: OmApplyChange[] = [];
  const patch: OmApplyPatch = {
    financials: mergeFinancials(current.financials, sidecar),
  };

  const bands = sidecar.public_bands ?? {};
  const bandPairs: { path: keyof ListingOmSnapshot & `band_${string}`; label: string; incoming?: string }[] = [
    { path: "band_gross_rent", label: "Gross Rents", incoming: bands.band_gross_rent },
    { path: "band_expense_load", label: "Operating Expenses", incoming: bands.band_expense_load },
    { path: "band_cash_on_cash", label: "Cash-on-cash", incoming: bands.band_cash_on_cash },
    { path: "band_cap_rate", label: "Cap rate", incoming: bands.band_cap_rate },
  ];
  for (const band of bandPairs) {
    if (band.incoming === undefined) continue;
    const next = band.incoming || null;
    if (sameText(current[band.path], next)) continue;
    patch[band.path] = next;
    changes.push({
      path: band.path,
      label: band.label,
      before: displayValue(current[band.path]),
      after: displayValue(next),
      group: "bands",
    });
  }

  const existingFin = normalizeFinancials(current.financials);
  const nextFin = patch.financials;
  const finFields: { path: string; label: string; before: unknown; after: unknown }[] = [
    { path: "financials.purchase_price", label: "Purchase price", before: existingFin.purchase_price, after: nextFin.purchase_price },
    { path: "financials.gross_rents", label: "Gross Rents", before: existingFin.gross_rents, after: nextFin.gross_rents },
    { path: "financials.padsplit_fees", label: "PadSplit fees", before: existingFin.padsplit_fees, after: nextFin.padsplit_fees },
    { path: "financials.net_earnings", label: "Net Earnings", before: existingFin.net_earnings, after: nextFin.net_earnings },
    { path: "financials.opex", label: "OpEx", before: existingFin.opex, after: nextFin.opex },
    { path: "financials.projected_debt_service", label: "Projected Debt Service", before: existingFin.projected_debt_service, after: nextFin.projected_debt_service },
    { path: "financials.cash_on_cash", label: "Cash on Cash", before: existingFin.cash_on_cash, after: nextFin.cash_on_cash },
    { path: "financials.cap_rate", label: "Cap Rate", before: existingFin.cap_rate, after: nextFin.cap_rate },
    { path: "financials.dscr", label: "DSCR Ratio", before: existingFin.dscr, after: nextFin.dscr },
    { path: "financials.noi", label: "NOI", before: existingFin.noi, after: nextFin.noi },
    { path: "financials.platform_fees", label: "Platform fees", before: existingFin.platform_fees, after: nextFin.platform_fees },
    { path: "financials.t12", label: "T12", before: existingFin.t12, after: nextFin.t12 },
    { path: "financials.scenarios", label: "Scenarios", before: existingFin.scenarios, after: nextFin.scenarios },
  ];
  for (const field of finFields) {
    if (JSON.stringify(field.before ?? "") === JSON.stringify(field.after ?? "")) continue;
    const before = displayValue(field.before);
    const after = displayValue(field.after);
    changes.push({
      path: field.path,
      label: field.label,
      before,
      after: before === after && Array.isArray(field.before) ? `${after} (updated)` : after,
      group: "financials",
    });
  }

  if (sidecar.improvements) {
    const next = sidecar.improvements.map((row) => ({ item: row.item ?? "", year: row.year ?? "", cost: row.cost ?? "" }));
    const currentList = current.improvements ?? [];
    if (JSON.stringify(currentList) !== JSON.stringify(next)) {
      patch.improvements = next.length > 0 ? next : null;
      changes.push({
        path: "improvements",
        label: "Improvements",
        before: displayValue(current.improvements),
        after: displayValue(next),
        group: "improvements",
      });
    }
  }

  const hints = sidecar.listing_hints ?? {};
  const hintText: { path: "nickname" | "om_number" | "submarket"; label: string; incoming?: string }[] = [
    { path: "nickname", label: "Nickname", incoming: hints.nickname },
    { path: "om_number", label: "OM number", incoming: hints.om_number },
    { path: "submarket", label: "Submarket", incoming: hints.submarket },
  ];
  for (const hint of hintText) {
    if (isBlank(hint.incoming)) continue;
    const incoming = hint.incoming!.trim();
    if (sameText(current[hint.path], incoming)) continue;
    const protectedHint = !isBlank(current[hint.path]);
    changes.push({
      path: hint.path,
      label: hint.label,
      before: displayValue(current[hint.path]),
      after: incoming,
      group: "hints",
      overwriteProtected: protectedHint,
    });
    if (!protectedHint || overwriteHints) patch[hint.path] = incoming;
  }

  const rooms = parseRooms(hints.rooms);
  if (rooms != null && rooms !== current.total_rooms) {
    const protectedHint = current.total_rooms != null;
    changes.push({
      path: "total_rooms",
      label: "Rooms",
      before: displayValue(current.total_rooms),
      after: String(rooms),
      group: "hints",
      overwriteProtected: protectedHint,
    });
    if (!protectedHint || overwriteHints) patch.total_rooms = rooms;
  }

  const buyerWorkbookHint = sidecar.documents?.buyer_workbook?.trim() || null;
  if (buyerWorkbookHint) {
    changes.push({
      path: "documents.buyer_workbook",
      label: "Buyer workbook filename",
      before: displayValue(current.financials?.buyer_workbook_filename),
      after: buyerWorkbookHint,
      group: "documents",
    });
  }

  return {
    dealKey: sidecar.deal_key ?? null,
    buyerWorkbookHint,
    changes,
    patch,
    protectedCount: changes.filter((c) => c.overwriteProtected).length,
  };
}
