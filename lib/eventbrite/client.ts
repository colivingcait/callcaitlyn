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

// Throws instead of swallowing/logging like eventbriteFetch does, so the
// manual backfill button (which has nowhere to check server console logs)
// can show the *actual* rejection reason in the Settings UI instead of a
// silent "0 synced" that looks identical to "nothing new happened".
async function eventbriteFetchOrThrow(url: string, token: string | undefined): Promise<Record<string, unknown>> {
  if (!token) throw new Error("No API token configured for this account");

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Eventbrite API returned ${res.status}: ${text.slice(0, 300) || res.statusText}`);
  }
  return res.json();
}

export async function fetchOrganizationId(token: string | undefined): Promise<string | null> {
  const data = await eventbriteFetchOrThrow("https://www.eventbriteapi.com/v3/users/me/organizations/", token);
  const orgs = data.organizations as Record<string, unknown>[] | undefined;
  const id = orgs?.[0]?.id;
  return typeof id === "string" ? id : null;
}

async function paginate(
  baseUrl: string,
  params: Record<string, string>,
  token: string | undefined,
  itemsKey: string,
): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = [];
  let continuation: string | undefined;

  for (let page = 0; page < 10; page++) {
    const url = new URL(baseUrl);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    if (continuation) url.searchParams.set("continuation", continuation);

    const data = await eventbriteFetchOrThrow(url.toString(), token);

    const pageItems = data[itemsKey] as Record<string, unknown>[] | undefined;
    if (pageItems?.length) items.push(...pageItems);

    const pagination = data.pagination as Record<string, unknown> | undefined;
    if (pagination?.has_more_items && typeof pagination.continuation === "string") {
      continuation = pagination.continuation;
    } else {
      break;
    }
  }

  return items;
}

// There's no "list all orders for an organization" endpoint - Eventbrite
// only exposes orders per-event (confirmed against their API reference, not
// guessed), so a full org sync has to list the org's events first and then
// each event's orders. Capped at 10 pages per call (up to 2500 events, 2500
// orders per event) so one click can't run away indefinitely.
export async function fetchOrganizationEvents(organizationId: string, token: string | undefined): Promise<Record<string, unknown>[]> {
  return paginate(
    `https://www.eventbriteapi.com/v3/organizations/${organizationId}/events/`,
    { order_by: "start_desc" },
    token,
    "events",
  );
}

export async function fetchEventOrders(eventId: string, token: string | undefined): Promise<Record<string, unknown>[]> {
  return paginate(
    `https://www.eventbriteapi.com/v3/events/${eventId}/orders/`,
    { status: "placed", expand: "attendees" },
    token,
    "orders",
  );
}

// Used for the manual "sync recent registrations" backfill button, not the
// webhook - walks every one of the account's events and pulls their placed
// orders, keeping only ones placed since `changedSince` (Eventbrite can't
// filter event-orders by date server-side, so this filters client-side).
export async function fetchRecentOrders(
  organizationId: string,
  token: string | undefined,
  changedSince: string,
): Promise<Record<string, unknown>[]> {
  const events = await fetchOrganizationEvents(organizationId, token);
  const cutoff = new Date(changedSince).getTime();
  const orders: Record<string, unknown>[] = [];

  for (const event of events) {
    const eventId = typeof event.id === "string" ? event.id : null;
    if (!eventId) continue;

    const eventOrders = await fetchEventOrders(eventId, token);
    for (const order of eventOrders) {
      const created = typeof order.created === "string" ? new Date(order.created).getTime() : NaN;
      if (Number.isNaN(created) || created < cutoff) continue;
      // The event-orders endpoint doesn't always echo event_id on each
      // order the way a single-order fetch does - fill it in from the
      // event we just fetched it from so downstream event-name lookup
      // never silently gets a null id.
      orders.push({ ...order, event_id: order.event_id ?? eventId });
    }
  }

  return orders;
}
