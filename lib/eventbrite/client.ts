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

export async function fetchOrganizationId(token: string | undefined): Promise<string | null> {
  const data = await eventbriteFetch("https://www.eventbriteapi.com/v3/users/me/organizations/", token);
  const orgs = data?.organizations as Record<string, unknown>[] | undefined;
  const id = orgs?.[0]?.id;
  return typeof id === "string" ? id : null;
}

// Used for the manual "sync recent registrations" backfill button, not the
// webhook - pulls every placed order since a given date so registrations
// missed by a broken/missing webhook subscription can be caught up on
// demand. Paginated via Eventbrite's continuation-token scheme, capped at
// 10 pages (2500 orders) so one click can't run away indefinitely.
export async function fetchRecentOrders(
  organizationId: string,
  token: string | undefined,
  changedSince: string,
): Promise<Record<string, unknown>[]> {
  const orders: Record<string, unknown>[] = [];
  let continuation: string | undefined;

  for (let page = 0; page < 10; page++) {
    const url = new URL(`https://www.eventbriteapi.com/v3/organizations/${organizationId}/orders/`);
    url.searchParams.set("status", "placed");
    url.searchParams.set("changed_since", changedSince);
    url.searchParams.set("expand", "attendees");
    if (continuation) url.searchParams.set("continuation", continuation);

    const data = await eventbriteFetch(url.toString(), token);
    if (!data) break;

    const pageOrders = data.orders as Record<string, unknown>[] | undefined;
    if (pageOrders?.length) orders.push(...pageOrders);

    const pagination = data.pagination as Record<string, unknown> | undefined;
    if (pagination?.has_more_items && typeof pagination.continuation === "string") {
      continuation = pagination.continuation;
    } else {
      break;
    }
  }

  return orders;
}
