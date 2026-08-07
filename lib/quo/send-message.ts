// Sends a text through Quo's API. Best-effort against their documented
// REST conventions (api.openphone.com/v1) - not yet confirmed against a
// real send, since only inbound webhooks have been tested so far. If this
// errors, the response body is included so we can adjust the request shape
// from a real error message instead of guessing further.

let cachedPhoneNumberId: string | null = null;

async function quoFetch(path: string, init: RequestInit) {
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

async function getPhoneNumberId(): Promise<string> {
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

export async function sendQuoText(
  toNumber: string,
  content: string,
): Promise<{ ok: true; quoMessageId: string | null } | { ok: false; error: string }> {
  try {
    const phoneNumberId = await getPhoneNumberId();

    const res = await quoFetch("/messages", {
      method: "POST",
      body: JSON.stringify({ content, from: phoneNumberId, to: [toNumber] }),
    });

    if (!res.ok) {
      return { ok: false, error: `Quo API error (${res.status}): ${await res.text()}` };
    }

    const body = await res.json();
    return { ok: true, quoMessageId: body?.data?.id ?? null };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
