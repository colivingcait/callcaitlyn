import type { ListingStatus } from "@/types/database";

export const LISTING_STATUSES: ListingStatus[] = ["coming_soon", "active", "under_contract", "archived"];

export const STATUS_LABEL: Record<ListingStatus, string> = {
  coming_soon: "Coming soon",
  active: "Active",
  under_contract: "Under contract",
  archived: "Archived",
};

export const STATUS_COLORS: Record<ListingStatus, { bg: string; text: string }> = {
  coming_soon: { bg: "#eff6ff", text: "#1d4ed8" },
  active: { bg: "#ecfdf5", text: "#047857" },
  under_contract: { bg: "#fef3c7", text: "#b45309" },
  archived: { bg: "#f5f5f4", text: "#57534e" },
};

const NEXT_STATUS: Record<ListingStatus, ListingStatus | null> = {
  coming_soon: "active",
  active: "under_contract",
  under_contract: "archived",
  archived: null,
};

const LISTING_STATUS_SET = new Set<string>(LISTING_STATUSES);

// closed / sold / inactive (and any other leftover) → archived.
// coming_soon, active, under_contract, archived stay as-is.
export function mapLegacyListingStatus(value: string | null | undefined): ListingStatus | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (LISTING_STATUS_SET.has(normalized)) return normalized as ListingStatus;
  return "archived";
}

export function listingStatusLabel(status: string | null | undefined): string {
  const mapped = mapLegacyListingStatus(status);
  if (!mapped) return "Unknown";
  return STATUS_LABEL[mapped];
}

export function listingStatusColors(status: string | null | undefined): { bg: string; text: string } {
  const mapped = mapLegacyListingStatus(status) ?? "archived";
  return STATUS_COLORS[mapped];
}

export function isListingStatus(value: string | null | undefined): value is ListingStatus {
  return Boolean(value && LISTING_STATUS_SET.has(value));
}

export function isPublicAvailableStatus(status: string | null | undefined): boolean {
  return status === "coming_soon" || status === "active";
}

export function isPublicUnderContractStatus(status: string | null | undefined): boolean {
  return status === "under_contract";
}

// Pure, client-safe - kept out of lib/data/listings.ts so a "use client"
// component (ListingStatusMenu) can import it without dragging in
// lib/supabase/server's next/headers dependency.
export function nextListingStatus(status: ListingStatus): ListingStatus | null {
  return NEXT_STATUS[status];
}
