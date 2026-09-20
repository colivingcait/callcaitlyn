import { normalizeFinancials } from "./crm-marketing-fields";
import type { ListingFinancials } from "@/types/database";

// Per-listing unlock payload for the public OM. sessionStorage keeps the
// numbers in this tab after the server-action refresh remounts the gate;
// an in-memory copy + subscriber list covers the same-tab race where the
// leaf remounts before the submit handler writes.
export const OM_UNLOCK_STORAGE_PREFIX = "om-unlock:";

export type OmUnlockPayload = {
  unlocked: true;
  financials: ListingFinancials | null;
  workbookUrl: string | null;
};

type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();
const memory = new Map<string, OmUnlockPayload>();
const parsedCache = new Map<string, { raw: string | null; parsed: OmUnlockPayload | null }>();

export function omUnlockStorageKey(slug: string): string {
  return `${OM_UNLOCK_STORAGE_PREFIX}${slug}`;
}

export function parseOmUnlockPayload(raw: unknown): OmUnlockPayload | null {
  if (raw == null) return null;
  let value: unknown = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (typeof value !== "object") return null;
  const parsed = value as { unlocked?: unknown; financials?: unknown; workbookUrl?: unknown };
  if (parsed.unlocked !== true) return null;
  const financials =
    parsed.financials == null ? null : normalizeFinancials(parsed.financials as ListingFinancials);
  return {
    unlocked: true,
    financials,
    workbookUrl: typeof parsed.workbookUrl === "string" && parsed.workbookUrl ? parsed.workbookUrl : null,
  };
}

export function subscribeOmUnlock(slug: string, onChange: Listener): () => void {
  let set = listeners.get(slug);
  if (!set) {
    set = new Set();
    listeners.set(slug, set);
  }
  set.add(onChange);
  return () => {
    set!.delete(onChange);
  };
}

function notify(slug: string) {
  listeners.get(slug)?.forEach((cb) => cb());
}

function readSession(slug: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(omUnlockStorageKey(slug));
  } catch {
    return null;
  }
}

export function readOmUnlock(slug: string): OmUnlockPayload | null {
  const mem = memory.get(slug);
  if (mem) return mem;
  const raw = readSession(slug);
  const cached = parsedCache.get(slug);
  if (cached && cached.raw === raw) return cached.parsed;
  const parsed = parseOmUnlockPayload(raw);
  parsedCache.set(slug, { raw, parsed });
  return parsed;
}

export function writeOmUnlock(slug: string, payload: OmUnlockPayload): OmUnlockPayload {
  const next: OmUnlockPayload = {
    unlocked: true,
    financials: payload.financials ? normalizeFinancials(payload.financials) : null,
    workbookUrl: payload.workbookUrl ?? null,
  };
  memory.set(slug, next);
  const raw = JSON.stringify(next);
  parsedCache.set(slug, { raw, parsed: next });
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(omUnlockStorageKey(slug), raw);
    } catch {
      // Private mode / quota: in-memory copy still unlocks this tab.
    }
  }
  notify(slug);
  return next;
}

export function clearOmUnlock(slug: string): void {
  memory.delete(slug);
  parsedCache.delete(slug);
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(omUnlockStorageKey(slug));
    } catch {
      // ignore
    }
  }
  notify(slug);
}
