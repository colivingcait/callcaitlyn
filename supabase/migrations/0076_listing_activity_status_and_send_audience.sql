-- Activity tab needs an append-only status log (same shape as
-- listing_price_changes) so "Active → Under contract" has a timestamp.
-- listing_sends.audience lets an RP blast row link back to the list it hit.

create table if not exists public.listing_status_changes (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  old_status text,
  new_status text not null,
  occurred_at timestamptz not null default now()
);

create index if not exists listing_status_changes_listing_idx
  on public.listing_status_changes(listing_id, occurred_at desc);

alter table public.listing_status_changes enable row level security;
do $$ begin
  create policy "owner full access" on public.listing_status_changes
    for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
exception
  when duplicate_object then null;
end $$;

alter table public.listing_sends add column if not exists audience text;
