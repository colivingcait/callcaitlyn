import type { ListingStatus } from "@/types/database";

export const STATUS_LABEL: Record<ListingStatus, string> = {
  coming_soon: "Coming soon",
  active: "Active",
  under_contract: "Under contract",
  closed: "Closed",
};

export const STATUS_COLORS: Record<ListingStatus, { bg: string; text: string }> = {
  coming_soon: { bg: "#eff6ff", text: "#1d4ed8" },
  active: { bg: "#ecfdf5", text: "#047857" },
  under_contract: { bg: "#fef3c7", text: "#b45309" },
  closed: { bg: "#f5f5f4", text: "#57534e" },
};

const NEXT_STATUS: Record<ListingStatus, ListingStatus | null> = {
  coming_soon: "active",
  active: "under_contract",
  under_contract: "closed",
  closed: null,
};

// Pure, client-safe - kept out of lib/data/listings.ts so a "use client"
// component (ListingStatusMenu) can import it without dragging in
// lib/supabase/server's next/headers dependency.
export function nextListingStatus(status: ListingStatus): ListingStatus | null {
  return NEXT_STATUS[status];
}
