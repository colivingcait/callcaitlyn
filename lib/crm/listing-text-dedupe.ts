import { normalizePhone, toE164 } from "@/lib/phone";

// Collapse listing RP text recipients by phone so one number never gets
// three outbound SMS because the same agent appeared on three buyer-ref
// rows (or the same digits with different punctuation).
//
// Comparison key is normalizePhone: digits-only, last 10 (US/Canada). That
// is the same uniqueness as E.164 +1XXXXXXXXXX used on the wire (toE164).
// "(404) 555-1212", "4045551212", and "+1 404-555-1212" are one send.
//
// Canonical row when several listing_agents (or a contact-shaped row)
// share that key: prefer a real name over a blank / digits-only "name"
// that is just the number. Ties keep the first row in list order (RP
// import order), so Fresh/Recent re-buckets don't shuffle who we greet.

export type ListingTextRecipient = {
  name: string;
  phone: string | null;
};

export function listingTextPhoneKey(phone: string | null | undefined): string | null {
  return normalizePhone(phone);
}

function isBareNumberName(name: string, phone: string | null | undefined): boolean {
  const trimmed = name.trim();
  if (!trimmed) return true;
  if (!/[A-Za-z]/.test(trimmed)) return true;
  const nameKey = listingTextPhoneKey(trimmed);
  const phoneKey = listingTextPhoneKey(phone);
  return !!nameKey && !!phoneKey && nameKey === phoneKey;
}

function namedRank(row: ListingTextRecipient): number {
  return isBareNumberName(row.name, row.phone) ? 0 : 1;
}

export function pickCanonicalListingTextRecipient<T extends ListingTextRecipient>(current: T, candidate: T): T {
  return namedRank(candidate) > namedRank(current) ? candidate : current;
}

export function queuedListingTextPhoneKeys(
  agents: { id: string; phone: string | null }[],
  queuedIds: Set<string>,
): Set<string> {
  const keys = new Set<string>();
  for (const agent of agents) {
    if (!queuedIds.has(agent.id)) continue;
    const key = listingTextPhoneKey(agent.phone);
    if (key) keys.add(key);
  }
  return keys;
}

export function isListingTextPhoneQueued(phone: string | null | undefined, queuedPhoneKeys: Set<string>): boolean {
  const key = listingTextPhoneKey(phone);
  return !!key && queuedPhoneKeys.has(key);
}

export function dedupeListingTextRecipients<T extends ListingTextRecipient>(rows: T[]): T[] {
  const canonicalByPhone = new Map<string, T>();
  for (const row of rows) {
    const key = listingTextPhoneKey(row.phone);
    if (!key) continue;
    const existing = canonicalByPhone.get(key);
    canonicalByPhone.set(key, existing ? pickCanonicalListingTextRecipient(existing, row) : row);
  }

  const emitted = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    const key = listingTextPhoneKey(row.phone);
    if (!key) {
      out.push(row);
      continue;
    }
    if (emitted.has(key)) continue;
    emitted.add(key);
    out.push(canonicalByPhone.get(key)!);
  }
  return out;
}

export function listingTextOutboundE164s<T extends ListingTextRecipient>(rows: T[]): string[] {
  return dedupeListingTextRecipients(rows)
    .map((row) => toE164(row.phone))
    .filter((n): n is string => n != null);
}
