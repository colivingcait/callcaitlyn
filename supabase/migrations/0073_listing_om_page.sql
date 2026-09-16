-- The public "offering memorandum" page never shows the address (client
-- requirement - shared only at showing), so it needs its own identity.
alter table public.listings add column nickname text;
alter table public.listings add column om_number text;
alter table public.listings add column submarket text;

-- Property detail cells the OM page shows beyond what already exists.
alter table public.listings add column year_built integer;
alter table public.listings add column year_renovated integer;
alter table public.listings add column private_bathrooms integer;
alter table public.listings add column padsplit_since date;
alter table public.listings add column parking text;
alter table public.listings add column laundry text;
alter table public.listings add column furnishings text;
alter table public.listings add column public_description text;

-- Public financial "bands" - deliberately imprecise display strings, not
-- computed from `financials`, so she controls the exact wording per listing
-- rather than the page rendering a raw number out of context.
alter table public.listings add column band_gross_rent text;
alter table public.listings add column band_expense_load text;
alter table public.listings add column band_cash_on_cash text;
alter table public.listings add column band_cap_rate text;

-- Gated underwriting detail - one jsonb beats twelve columns for a T12 line-
-- item table plus financing scenarios that vary in count per listing. Shape:
-- { t12: [{label, value, subtotal?}], noi, cap_rate, vacancy_pct?,
--   scenarios: [{label, coc, cash_in, debt_service, cash_flow}],
--   occupancy_summary? }
alter table public.listings add column financials jsonb;

-- Capital improvements - optional; the marketing tab hides the section
-- entirely when this is empty/null rather than showing a blank block.
alter table public.listings add column improvements jsonb;

-- Co-listing agent - the sidebar card only renders when a name is present.
alter table public.listings add column co_agent_name text;
alter table public.listings add column co_agent_brokerage text;
alter table public.listings add column co_agent_phone text;
alter table public.listings add column co_agent_email text;

-- Process-step terms, so the timeline copy matches each seller's actual
-- terms instead of a hardcoded "10 days" / "30 days".
alter table public.listings add column dd_days integer not null default 10;
alter table public.listings add column seller_support_days integer not null default 30;

-- Some listings (e.g. a one-off referral) shouldn't pitch "sell your
-- PadSplit too" - toggleable per listing rather than baked into the page.
alter table public.listings add column show_seller_section boolean not null default true;

-- Photo categories from PadSplit's own data, so exterior shots (withheld at
-- the seller's request) can be filtered out automatically - plus a manual
-- override for whatever the auto-filter misses or she wants pulled anyway.
alter table public.listings add column padsplit_photos jsonb;
alter table public.listings add column excluded_photo_urls text[] not null default '{}';

-- Daily occupancy history for the 12-month trend chart. The scrape only
-- ever overwrites `listings.occupied_rooms`/`total_rooms` (today's state) -
-- this is the append-only log the trend reads from instead.
create table public.listing_occupancy_snapshots (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  occupied_rooms integer,
  total_rooms integer,
  captured_at timestamptz not null default now()
);

create index listing_occupancy_snapshots_listing_idx on public.listing_occupancy_snapshots(listing_id, captured_at desc);

alter table public.listing_occupancy_snapshots enable row level security;
create policy "owner full access" on public.listing_occupancy_snapshots
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
