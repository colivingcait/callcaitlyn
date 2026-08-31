-- Phase 4 Stop 1: the house-hack calculator's stored quotes, plus view
-- tracking on the public one-pager they get shared as. Quotes are
-- immutable once saved - editing inputs afterward produces a new row and
-- a new slug, never an in-place update, so a link she already sent keeps
-- meaning what it meant when she sent it, and quote_views' "opened it
-- twice" reading never spans numbers that quietly changed underneath it.
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  -- null = run cold from /numbers with nobody attached yet.
  contact_id uuid references public.contacts(id) on delete set null,
  -- 8-char url-safe token, not a uuid - the whole point is a short link.
  slug text not null unique,
  -- Snapshot at save time, independent of the contact's name changing later.
  client_first_name text not null default '',
  property_address text not null default '',
  property_description text not null default '',
  purchase_price numeric not null,
  down_payment_pct numeric not null,
  interest_rate_pct numeric not null,
  loan_type text not null check (loan_type in ('fha_30', 'conventional_30', 'conventional_15')),
  -- null = not entered, distinct from an entered 0.
  rent_from_other_unit numeric,
  -- null = the comparison sentence is omitted entirely on send/display.
  renting_now numeric,
  taxes_annual numeric not null default 0,
  insurance_annual numeric not null default 0,
  -- Includes the financed FHA UFMIP already (see lib/crm/house-hack-calc.ts) -
  -- a future rate-alert recompute multiplies this straight through a new
  -- rate without re-deriving the FHA financing step.
  loan_amount numeric not null,
  monthly_principal_interest numeric not null,
  monthly_taxes_insurance numeric not null,
  monthly_mortgage_insurance numeric not null default 0,
  monthly_maintenance numeric not null,
  monthly_out_of_pocket numeric not null,
  cash_to_close numeric not null,
  -- null iff rent_from_other_unit is null.
  both_sides_rented_out_of_pocket numeric,
  -- Bumped in code whenever house-hack-calc.ts's constants change, so a
  -- future job can find quotes computed under stale assumptions.
  calc_version integer not null default 1,
  created_at timestamptz not null default now()
);
create unique index quotes_slug_idx on public.quotes(slug);
create index quotes_contact_idx on public.quotes(contact_id);
create index quotes_owner_created_idx on public.quotes(owner_id, created_at desc);

alter table public.quotes enable row level security;
create policy "owner full access" on public.quotes
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table public.quote_views (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  -- Client-generated, held in sessionStorage - a same-tab dedupe token,
  -- not a durable visitor identity. No cookies, no fingerprinting.
  visitor_key text not null,
  viewed_at timestamptz not null default now(),
  user_agent text
);
create index quote_views_quote_viewed_idx on public.quote_views(quote_id, viewed_at desc);
create index quote_views_dedupe_idx on public.quote_views(quote_id, visitor_key, viewed_at desc);

alter table public.quote_views enable row level security;
-- No owner_id column here - every write comes from the public route via
-- the admin client (bypasses RLS), and every read goes through quotes,
-- which is owner-scoped - same "scope RLS through the parent" pattern
-- proposed_changes already uses via meeting_transcripts.
create policy "owner full access" on public.quote_views
  for all using (exists (select 1 from public.quotes q where q.id = quote_id and q.owner_id = auth.uid()))
  with check (exists (select 1 from public.quotes q where q.id = quote_id and q.owner_id = auth.uid()));
