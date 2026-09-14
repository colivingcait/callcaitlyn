-- Listings portal: a new section separate from the CRM's people. Agents
-- from an FMLS/GAMLS reverse-prospecting export live inside a listing and
-- never enter `contacts` - so they cannot appear in the pipeline, the
-- Active-leads count, any metric, or a drip sequence. See README part 2
-- §3 for the full design.

-- Brokerage for a promoted agent ("Add to contacts as Referral Partner").
-- Doesn't exist today, which is why the Blinq integration writes
-- company/title as a timeline note instead of a real field.
alter table public.contacts add column if not exists company text;

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  address text not null,
  city text,
  state text,
  zip text,
  list_price numeric,
  beds numeric,
  baths numeric,
  sqft integer,
  property_type text,
  mls_number text,
  status text not null default 'coming_soon' check (status in ('coming_soon', 'active', 'under_contract', 'closed')),
  story text,
  photo_paths text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index listings_owner_status_idx on public.listings(owner_id, status);

alter table public.listings enable row level security;
create policy "owner full access" on public.listings
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- What makes the price-drop send and the seller update possible - an
-- append-only log rather than just overwriting list_price, so "5 days on
-- market, listed $479,000, now $465,000" has something to read from.
create table public.listing_price_changes (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  old_price numeric,
  new_price numeric not null,
  occurred_at timestamptz not null default now()
);

create index listing_price_changes_listing_idx on public.listing_price_changes(listing_id, occurred_at desc);

alter table public.listing_price_changes enable row level security;
create policy "owner full access" on public.listing_price_changes
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- The agent directory: every agent ever imported (deduped across
-- listings) plus ones added by hand. Section-level, not inside any one
-- listing - a Coming Soon listing has no RP list yet (FMLS only produces
-- one once a listing is Active), and that's exactly when a directory send
-- is useful.
create table public.agents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  brokerage text,
  email text,
  phone text,
  source text not null default 'manual' check (source in ('fmls', 'gamls', 'manual')),
  first_seen timestamptz not null default now(),
  last_emailed_at timestamptz,
  opted_out_at timestamptz,
  created_at timestamptz not null default now()
);

create index agents_owner_idx on public.agents(owner_id);
create unique index agents_owner_email_idx on public.agents(owner_id, lower(email)) where email is not null;

alter table public.agents enable row level security;
create policy "owner full access" on public.agents
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- One listing's reverse-prospecting list: the raw parsed CSV rows plus
-- per-agent contacted/replied state. Keyed on (listing_id, ref_no) so
-- re-importing an updated export updates existing rows instead of
-- duplicating them (the same agent can appear under more than one ref_no
-- across different imports/buyer-search-criteria, so ref_no - not
-- email/phone - is the real identity here).
create table public.listing_agents (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete set null,
  name text not null,
  ref_no text not null,
  brokerage text,
  email text,
  phone text,
  count_sent integer,
  date_sent text,
  state text not null default 'not_contacted' check (state in ('not_contacted', 'emailed', 'texted', 'replied', 'opted_out')),
  replied_at timestamptz,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, ref_no)
);

create index listing_agents_listing_idx on public.listing_agents(listing_id);

alter table public.listing_agents enable row level security;
create policy "owner full access" on public.listing_agents
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Inbound/outbound agent messages, kept fully separate from `activities` -
-- an agent recognized here never creates a contact, never gets an
-- engagement tag, and never gets an AI read (see the Quo webhook's
-- reverse phone lookup). listing_agent_id is nullable because a call/text
-- can match the cross-listing `agents` directory without matching any one
-- listing's list.
create table public.listing_agent_messages (
  id uuid primary key default gen_random_uuid(),
  -- Nullable: a match against the cross-listing `agents` directory alone
  -- (no listing_agents row, e.g. an agent added by hand with no RP list
  -- yet) has no one specific listing to attach to.
  listing_id uuid references public.listings(id) on delete cascade,
  listing_agent_id uuid references public.listing_agents(id) on delete set null,
  agent_id uuid references public.agents(id) on delete set null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  channel text not null default 'text' check (channel in ('text', 'email', 'call')),
  body text,
  occurred_at timestamptz not null default now(),
  quo_message_id text unique,
  quo_call_id text unique,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index listing_agent_messages_listing_idx on public.listing_agent_messages(listing_id, occurred_at desc);

alter table public.listing_agent_messages enable row level security;
create policy "owner full access" on public.listing_agent_messages
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Bare email/phone, no profile - an opt-out is honored across every
-- listing even though agent records themselves are per-listing.
create table public.agent_opt_outs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

create unique index agent_opt_outs_owner_email_idx on public.agent_opt_outs(owner_id, lower(email)) where email is not null;
create unique index agent_opt_outs_owner_phone_idx on public.agent_opt_outs(owner_id, phone) where phone is not null;

alter table public.agent_opt_outs enable row level security;
create policy "owner full access" on public.agent_opt_outs
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Agent sends (email or text) - deliberately its own thing, not a `listing`
-- BlastTarget bolted onto text_blasts/email_sequences. Those two systems
-- resolve recipients from `contacts` end to end (merge fields, engagement
-- tagging, unsubscribe-by-contact); an agent send resolves recipients
-- directly from listing_agents rows instead, and must never appear in the
-- Campaigns list. Mirrors text_blasts' own shape (see migration 0031) so
-- the composer UI can reuse the same preview/test/confirm patterns.
create table public.listing_sends (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  channel text not null check (channel in ('email', 'text')),
  subject text,
  message text not null,
  status text not null default 'sending' check (status in ('sending', 'completed', 'canceled')),
  send_immediately boolean not null default true,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index listing_sends_listing_idx on public.listing_sends(listing_id, created_at desc);

alter table public.listing_sends enable row level security;
create policy "owner full access" on public.listing_sends
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table public.listing_send_recipients (
  id uuid primary key default gen_random_uuid(),
  send_id uuid not null references public.listing_sends(id) on delete cascade,
  listing_agent_id uuid not null references public.listing_agents(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  sent_at timestamptz,
  error text
);

create index listing_send_recipients_send_idx on public.listing_send_recipients(send_id, status);

alter table public.listing_send_recipients enable row level security;
create policy "owner full access via send" on public.listing_send_recipients
  for all using (exists (select 1 from public.listing_sends s where s.id = send_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.listing_sends s where s.id = send_id and s.owner_id = auth.uid()));
