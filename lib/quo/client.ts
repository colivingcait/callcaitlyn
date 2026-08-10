// Shared low-level client for Quo's API (api.openphone.com/v1 - Quo is
// OpenPhone's current name, the API host hasn't changed). Used by both
// outbound texting and contact sync.

export async function quoFetch(path: string, init: RequestInit) {
  const apiKey = process.env.QUO_API_KEY;
  if (!apiKey) throw new Error("QUO_API_KEY is not configured");

  return fetch(`https://api.openphone.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
}

let cachedPhoneNumberId: string | null = null;

export async function getQuoPhoneNumberId(): Promise<string> {
  if (cachedPhoneNumberId) return cachedPhoneNumberId;

  const res = await quoFetch("/phone-numbers", { method: "GET" });
  if (!res.ok) {
    throw new Error(`Could not look up Quo phone number (${res.status}): ${await res.text()}`);
  }
  const body = await res.json();
  const id = body?.data?.[0]?.id;
  if (!id) throw new Error("No phone number found on this Quo account");

  cachedPhoneNumberId = id;
  return id;
}
