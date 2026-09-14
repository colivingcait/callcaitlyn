import { splitLine } from "@/lib/crm/bulk-import-contacts";

// Parses an FMLS/GAMLS reverse-prospecting export - built and tested
// against the owner's real "654 Gillette RP 9.14.26" export, which is
// messier than a clean CSV:
//
// - Row 1 is the listing's address ("654 Gillette AVE"), not a header.
// - Headers sit on row 2: Agent, Ref #, Pre-approved?, (blank), Count,
//   Date Sent, (blank), and one column literally titled
//   "Email   Office Name Direct Work Phone".
// - That last column jams three values into one space-separated string -
//   split it by rule: the `@` token is the email, a trailing
//   ###-###-#### is the phone, whatever's left between them is the
//   brokerage.
// - Names sometimes arrive shouting (FRANK BROCKWAY) - title-cased here.
// - Date Sent sometimes holds a time (12:26 PM) instead of a date - kept
//   as free text rather than forced into a real date, since there's
//   nothing to parse a bare time into.
// - There is no buyer criteria in this export - only ref/count/date.
//
// Column order is matched by header keyword, the same tolerant approach
// the commission bulk import uses, so a slightly different real-world
// export (GAMLS, or a future FMLS format change) with extra/reordered
// columns still parses instead of silently misreading them.

export type ParsedRpRow = {
  line: number;
  name: string;
  refNo: string;
  brokerage: string | null;
  email: string | null;
  phone: string | null;
  countSent: number | null;
  dateSent: string | null;
  raw: Record<string, string>;
};

export type ParsedRpImport = {
  rows: ParsedRpRow[];
  skipped: { line: number; reason: string }[];
  detectedAddress: string | null;
};

function normalizeHeader(h: string) {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

function looksLikeHeaderRow(cells: string[]): boolean {
  const joined = cells.map(normalizeHeader).join(" | ");
  return joined.includes("ref") && (joined.includes("email") || joined.includes("agent"));
}

// FRANK BROCKWAY -> Frank Brockway. A name with any lowercase letter
// already is left exactly as typed - this only fires on the shouting case.
function titleCaseIfShouting(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed !== trimmed.toUpperCase() || !/[A-Z]/.test(trimmed)) return trimmed;
  return trimmed
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

const EMAIL_RE = /[^\s,]+@[^\s,]+\.[^\s,]+/;
const PHONE_RE = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;

// Splits "carmen.j@compass.com Compass 678-898-3404" (or a quoted variant
// with a comma in the brokerage name) into its three parts.
function splitContactColumn(raw: string): { email: string | null; phone: string | null; brokerage: string | null } {
  let remainder = raw.trim();

  const emailMatch = remainder.match(EMAIL_RE);
  const email = emailMatch ? emailMatch[0].toLowerCase() : null;
  if (emailMatch) remainder = (remainder.slice(0, emailMatch.index) + remainder.slice(emailMatch.index! + emailMatch[0].length)).trim();

  const phoneMatch = remainder.match(PHONE_RE);
  const phone = phoneMatch ? phoneMatch[0].trim() : null;
  if (phoneMatch) remainder = (remainder.slice(0, phoneMatch.index) + remainder.slice(phoneMatch.index! + phoneMatch[0].length)).trim();

  const brokerage = remainder.replace(/^[\s,]+|[\s,]+$/g, "") || null;
  return { email, phone, brokerage };
}

export function parseRpExport(text: string): ParsedRpImport {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], skipped: [], detectedAddress: null };

  let headerLineIndex = lines.findIndex((l) => looksLikeHeaderRow(splitLine(l)));
  let detectedAddress: string | null = null;
  if (headerLineIndex === -1) {
    // No recognizable header at all - assume a plain header-first CSV
    // (someone's own paste) and treat row 0 as the header.
    headerLineIndex = 0;
  } else if (headerLineIndex > 0) {
    const firstCell = splitLine(lines[0])[0]?.trim();
    if (firstCell) detectedAddress = firstCell;
  }

  const headerCells = splitLine(lines[headerLineIndex]).map(normalizeHeader);
  const fieldByIndex = headerCells.map((h) => {
    if (h.includes("ref")) return "refNo" as const;
    if (h.includes("count")) return "countSent" as const;
    if (h.includes("date")) return "dateSent" as const;
    if (h.includes("email")) return "contact" as const;
    if (h === "agent" || h.includes("agent")) return "name" as const;
    return null;
  });

  const rows: ParsedRpRow[] = [];
  const skipped: { line: number; reason: string }[] = [];

  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    const byField: Record<string, string> = {};
    fieldByIndex.forEach((field, idx) => {
      if (field) byField[field] = (cells[idx] ?? "").trim();
    });

    const rawByHeader: Record<string, string> = {};
    headerCells.forEach((h, idx) => {
      if (h) rawByHeader[h] = (cells[idx] ?? "").trim();
    });

    if (!byField.name || !byField.refNo) {
      skipped.push({ line: i + 1, reason: !byField.name ? "no agent name" : "no Ref #" });
      continue;
    }

    const { email, phone, brokerage } = splitContactColumn(byField.contact ?? "");
    const countSent = byField.countSent ? Number.parseInt(byField.countSent, 10) : null;

    rows.push({
      line: i + 1,
      name: titleCaseIfShouting(byField.name),
      refNo: byField.refNo,
      brokerage,
      email,
      phone,
      countSent: Number.isFinite(countSent) ? countSent : null,
      dateSent: byField.dateSent || null,
      raw: rawByHeader,
    });
  }

  return { rows, skipped, detectedAddress };
}
