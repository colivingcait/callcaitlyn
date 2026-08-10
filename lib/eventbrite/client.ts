// Eventbrite's webhooks only send a reference to the changed resource, not
// its data - the handler has to fetch it back from their API. Field names
// below follow Eventbrite's documented API shape but haven't been
// confirmed against a real delivery - see README's Eventbrite section.

// Token is passed in rather than read from a single fixed env var - two
// separate Eventbrite accounts (House Hacking, Women's REI) means two
// separate Private Tokens, and Eventbrite API auth is scoped to whichever
// account issued the token, so the caller has to pick the right one based
// on which account's webhook fired. See the webhook route.
export async function eventbriteFetch(url: string, token: string | undefined): Promise<Record<string, unknown> | null> {
  if (!token) {
    console.error("Eventbrite webhook received but no API token is configured for this account");
    return null;
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    console.error("Eventbrite API fetch failed", url, res.status, await res.text().catch(() => ""));
    return null;
  }

  return res.json();
}

export async function fetchOrderWithAttendees(orderApiUrl: string, token: string | undefined) {
  const separator = orderApiUrl.includes("?") ? "&" : "?";
  return eventbriteFetch(`${orderApiUrl}${separator}expand=attendees`, token);
}

export async function fetchEventName(eventId: string, token: string | undefined): Promise<string | null> {
  const event = await eventbriteFetch(`https://www.eventbriteapi.com/v3/events/${eventId}/`, token);
  const name = event?.name as Record<string, unknown> | undefined;
  return typeof name?.text === "string" ? name.text : null;
}
