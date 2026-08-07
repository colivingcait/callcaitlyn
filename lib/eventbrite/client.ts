// Eventbrite's webhooks only send a reference to the changed resource, not
// its data - the handler has to fetch it back from their API. Field names
// below follow Eventbrite's documented API shape but haven't been
// confirmed against a real delivery - see README's Eventbrite section.

export async function eventbriteFetch(url: string): Promise<Record<string, unknown> | null> {
  const token = process.env.EVENTBRITE_API_TOKEN;
  if (!token) {
    console.error("Eventbrite webhook received but EVENTBRITE_API_TOKEN is not configured");
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

export async function fetchOrderWithAttendees(orderApiUrl: string) {
  const separator = orderApiUrl.includes("?") ? "&" : "?";
  return eventbriteFetch(`${orderApiUrl}${separator}expand=attendees`);
}

export async function fetchEventName(eventId: string): Promise<string | null> {
  const event = await eventbriteFetch(`https://www.eventbriteapi.com/v3/events/${eventId}/`);
  const name = event?.name as Record<string, unknown> | undefined;
  return typeof name?.text === "string" ? name.text : null;
}
