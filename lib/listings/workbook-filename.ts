import { createHmac, timingSafeEqual } from "crypto";

const WORKBOOK_TTL_SECONDS = 60 * 60 * 24 * 7;

function workbookSecret(): string {
  return process.env.CRON_SECRET || process.env.CRM_OWNER_USER_ID || "callcaitlyn-workbook";
}

function sanitizeFilename(name: string): string {
  const trimmed = name.trim().replace(/[/\\?%*:|"<>]/g, "").replace(/\s+/g, " ");
  return trimmed || "Workbook.xlsx";
}

function looksHashedOrRandom(name: string): boolean {
  if (/buyer_workbook-\d+-/i.test(name)) return true;
  if (/[0-9a-f]{8,}-[0-9a-f]{4,}/i.test(name)) return true;
  return false;
}

export function slugWorkbookName(title: string): string {
  const withoutExt = title.trim().replace(/\.(xlsx|xls)$/i, "");
  const slug = withoutExt
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `${slug}-Workbook.xlsx` : "Workbook.xlsx";
}

export function workbookDownloadFilename(input: {
  nickname?: string | null;
  storedName?: string | null;
  storagePath?: string | null;
}): string {
  const stored = input.storedName?.trim();
  if (stored && /\.(xlsx|xls)$/i.test(stored) && !looksHashedOrRandom(stored)) {
    return sanitizeFilename(stored);
  }
  if (input.nickname?.trim()) return slugWorkbookName(input.nickname);
  const fromPath = (input.storagePath ?? "").split("/").pop() ?? "";
  const stripped = fromPath.replace(/^buyer_workbook-\d+-/i, "");
  if (stripped && /\.(xlsx|xls)$/i.test(stripped) && !looksHashedOrRandom(stripped)) {
    return sanitizeFilename(stripped);
  }
  return "Workbook.xlsx";
}

export function workbookStoragePath(listingId: string, filename: string): string {
  const safe = sanitizeFilename(filename).replace(/[^A-Za-z0-9._-]/g, "_");
  return `${listingId}/${safe || "Workbook.xlsx"}`;
}

export function createWorkbookDownloadToken(slug: string, expiresAtMs: number): string {
  const exp = String(expiresAtMs);
  const sig = createHmac("sha256", workbookSecret()).update(`${slug}:${exp}`).digest("base64url");
  return `${exp}.${sig}`;
}

export function verifyWorkbookDownloadToken(slug: string, token: string): boolean {
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp)) return false;
  if (Number(exp) < Date.now()) return false;
  const expected = createHmac("sha256", workbookSecret()).update(`${slug}:${exp}`).digest("base64url");
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function workbookDownloadPath(slug: string, ttlSeconds = WORKBOOK_TTL_SECONDS): string {
  const token = createWorkbookDownloadToken(slug, Date.now() + ttlSeconds * 1000);
  return `/listing/${encodeURIComponent(slug)}/workbook?t=${encodeURIComponent(token)}`;
}

export function contentDispositionAttachment(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
