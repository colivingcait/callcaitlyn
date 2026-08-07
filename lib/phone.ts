// Normalizes any phone string down to a comparable key: the last 10 digits
// (US/Canada numbers, with or without a leading country code / punctuation).
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return null;
  return digits.slice(-10);
}

export function phonesMatch(a: string | null | undefined, b: string | null | undefined) {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  return !!na && !!nb && na === nb;
}
