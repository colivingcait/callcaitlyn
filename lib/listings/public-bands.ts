// Public OM / Marketing bands are deliberately imprecise display strings.
// They are not computed from gated financials. Source of truth is Vera's
// sidecar `public_bands` (Apply-to-OM) or the Marketing OM fields.
// Public UI must show a single rounded tilde, never a min–max range.

const PHRASE_TO_TILDE: Record<string, string> = {
  "$5.0–5.5k/mo": "~$5,500/mo",
  "$5.0-5.5k/mo": "~$5,500/mo",
  "high-teens%": "~19%",
  "high-teens to low-20s%": "~20%",
  "low-10s%": "~10%",
  "low-teens%": "~12%",
  "mid-teens%": "~15%",
  "$60k–$65k t12 collected": "~$65,000 T12 collected",
  "$60k-$65k t12 collected": "~$65,000 T12 collected",
  "15–20% of gross": "~18%",
  "15-20% of gross": "~18%",
  "18–22% @ 20% down / 7% / 30yr dscr": "~20%",
  "18-22% @ 20% down / 7% / 30yr dscr": "~20%",
  "10–11%": "~10%",
  "10-11%": "~10%",
};

function foldBand(value: string): string {
  return value
    .trim()
    .replace(/[\u2013\u2014]/g, "–")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function parseScaledNumber(raw: string): number | null {
  const trimmed = raw.trim().replace(/[$,]/g, "");
  if (!trimmed) return null;
  const k = /k$/i.test(trimmed);
  const n = Number(trimmed.replace(/k$/i, ""));
  if (!Number.isFinite(n)) return null;
  return k ? n * 1000 : n;
}

function formatTildeMoney(amount: number): string {
  return `~$${Math.round(amount).toLocaleString("en-US")}`;
}

function formatTildePercent(amount: number): string {
  return `~${Math.round(amount)}%`;
}

function convertNumericRange(value: string): string | null {
  const normalized = value.trim().replace(/[\u2013\u2014]/g, "–");

  const pct = normalized.match(/^([\d.]+)\s*–\s*([\d.]+)\s*%(.*)$/);
  if (pct) {
    const high = Number(pct[2]);
    if (!Number.isFinite(high)) return null;
    return formatTildePercent(high);
  }

  const money = normalized.match(
    /^\$\s*([\d,.]+k?)\s*–\s*\$?\s*([\d,.]+k?)\s*(.*)$/i,
  ) ?? normalized.match(
    /^([\d,.]+k)\s*–\s*\$?\s*([\d,.]+k?)\s*(.*)$/i,
  );
  if (money) {
    const high = parseScaledNumber(money[2]);
    if (high == null) return null;
    const rest = (money[3] ?? "").trim();
    const suffix = rest ? (rest.startsWith("/") ? rest : ` ${rest}`) : "";
    return `${formatTildeMoney(high)}${suffix}`;
  }

  return null;
}

export function formatPublicBand(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("~")) return trimmed.replace(/[\u2013\u2014]/g, "–").replace(/\s+/g, " ");

  const mapped = PHRASE_TO_TILDE[foldBand(trimmed)];
  if (mapped) return mapped;

  const converted = convertNumericRange(trimmed);
  if (converted) return converted;

  return trimmed;
}
