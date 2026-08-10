import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function initials(firstName: string, lastName?: string | null) {
  const a = firstName?.[0] ?? "";
  const b = lastName?.[0] ?? "";
  return (a + b).toUpperCase() || "?";
}

export function fullName(c: { first_name: string; last_name?: string | null }) {
  return [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
}

export function formatCurrency(value: number | null | undefined) {
  if (value == null) return "—";
  return `$${Math.round(value).toLocaleString()}`;
}

export function formatPercent(value: number | null | undefined, digits = 1) {
  if (value == null) return "—";
  return `${value.toFixed(digits)}%`;
}

export function formatPhone(phone?: string | null) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

// A tracked link's full URL is usually too long to show in a compact list -
// hostname + path is enough to recognize which link it is at a glance.
export function shortenUrl(url: string) {
  try {
    const u = new URL(url);
    const path = u.pathname === "/" ? "" : u.pathname.replace(/\/$/, "");
    return `${u.hostname.replace(/^www\./, "")}${path}`;
  } catch {
    return url;
  }
}

export const TIMELINE_LABELS: Record<string, string> = {
  asap: "ASAP",
  "1_3_months": "1–3 months",
  "3_6_months": "3–6 months",
  "6_12_months": "6–12 months",
  "12_plus_months": "12+ months",
  just_browsing: "Just browsing",
  unknown: "Unknown",
};

export const CONTACT_TYPE_LABELS: Record<string, string> = {
  buyer: "Buyer",
  seller: "Seller",
  both: "Buyer & Seller",
  investor: "Investor",
  renter: "Renter",
  referral_partner: "Referral Partner",
  vendor: "Vendor",
  past_client: "Past Client",
  sphere: "Sphere",
  other: "Other",
};

export const REPRESENTING_LABELS: Record<string, string> = {
  buyer: "Buyer",
  seller: "Seller",
  both: "Buy/Sell",
};

export const REPRESENTING_COLORS: Record<string, string> = {
  buyer: "#3b82f6",
  seller: "#a855f7",
  both: "#f97316",
};

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  primary_residence: "Primary Residence",
  house_hack: "House Hack",
  investment: "Investment",
  co_living: "Co-living",
  other: "Other",
};
