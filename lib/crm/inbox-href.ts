export function inboxHref(opts?: { filter?: string | null; hidden?: boolean; spam?: boolean }): string {
  const params = new URLSearchParams();
  if (opts?.filter && opts.filter !== "all") params.set("filter", opts.filter);
  if (opts?.hidden) params.set("hidden", "1");
  if (opts?.spam) params.set("spam", "1");
  const qs = params.toString();
  return qs ? `/messages?${qs}` : "/messages";
}

export function threadHref(
  contactId: string,
  opts?: { filter?: string | null; hidden?: boolean; spam?: boolean },
): string {
  const params = new URLSearchParams();
  if (opts?.filter && opts.filter !== "all") params.set("from", opts.filter);
  if (opts?.hidden) params.set("hidden", "1");
  if (opts?.spam) params.set("spam", "1");
  const qs = params.toString();
  return qs ? `/messages/${contactId}?${qs}` : `/messages/${contactId}`;
}
