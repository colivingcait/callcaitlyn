-- ============================================================================
-- SCHEMA CATCH-UP SCRIPT
-- ============================================================================
-- Run this ONCE in the Supabase SQL Editor. It re-applies everything from
-- migrations 0001 through 0025 in an idempotent, safe-to-rerun form, so it
-- doesn't matter which individual migration files were or weren't run
-- historically - anything already present is left untouched, anything
-- missing gets added. Safe to run multiple times.
--
-- Why this exists: several columns/tables have turned out to be missing on
-- the live database even though their migration files existed in the repo
-- (0002's last_event_name, 0014's expected_closing_date, and others) -
-- guessing which single migration is missing one error at a time doesn't
-- scale. Run this once and that whole class of bug goes away.
-- ============================================================================

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- pipeline_stages
-- ---------------------------------------------------------------------------
create table if not exists public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#94a3b8',
  sort_order integer not null default 0,
  is_closed_won boolean not null default false,
  is_closed_lost boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists pipeline_stages_owner_idx on public.pipeline_stages(owner_id, sort_order);
alter table public.pipeline_stages add column if not exists is_trash boolean not null default false;
alter table public.pipeline_stages add column if not exists is_under_contract boolean not null default false;
update public.pipeline_stages set is_under_contract = true where lower(name) = 'under contract' and is_under_contract = false;
update public.pipeline_stages set is_closed_won = true where name = 'Past Client' and is_closed_won = false and is_closed_lost = false;

-- ---------------------------------------------------------------------------
-- tags
-- ---------------------------------------------------------------------------
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#94a3b8',
  created_at timestamptz not null default now(),
  unique (owner_id, name)
);

insert into public.tags (owner_id, name, color)
select u.id, 'House Hacking', '#0ea5e9' from auth.users u
where not exists (select 1 from public.tags t where t.owner_id = u.id and t.name = 'House Hacking');
insert into public.tags (owner_id, name, color)
select u.id, 'House Hacker', '#8b5cf6' from auth.users u
where not exists (select 1 from public.tags t where t.owner_id = u.id and t.name = 'House Hacker');

-- ---------------------------------------------------------------------------
-- contacts
-- ---------------------------------------------------------------------------
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text default '',
  email text,
  phone text,
  secondary_phone text,
  contact_type text not null default 'buyer'
    check (contact_type in ('buyer', 'seller', 'both', 'investor', 'renter', 'referral_partner', 'vendor', 'past_client', 'sphere', 'other')),
  stage_id uuid references public.pipeline_stages(id) on delete set null,
  lead_source text,
  budget_min numeric,
  budget_max numeric,
  areas_of_interest text[] not null default '{}',
  timeline text default 'unknown'
    check (timeline in ('asap', '1_3_months', '3_6_months', '6_12_months', '12_plus_months', 'just_browsing', 'unknown')),
  next_follow_up_at timestamptz,
  birthday date,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  notes text,
  archived boolean not null default false,
  ai_last_status_note text,
  ai_last_analyzed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contacts_owner_stage_idx on public.contacts(owner_id, stage_id);
create index if not exists contacts_owner_followup_idx on public.contacts(owner_id, next_follow_up_at);
create index if not exists contacts_owner_archived_idx on public.contacts(owner_id, archived);
create index if not exists contacts_search_idx on public.contacts using gin (
  to_tsvector('simple', coalesce(first_name,'') || ' ' || coalesce(last_name,'') || ' ' || coalesce(email,'') || ' ' || coalesce(phone,''))
);
drop trigger if exists contacts_set_updated_at on public.contacts;
create trigger contacts_set_updated_at before update on public.contacts for each row execute function public.set_updated_at();

alter table public.contacts add column if not exists last_event_name text;
alter table public.contacts add column if not exists last_event_at timestamptz;
alter table public.contacts add column if not exists representing text check (representing in ('buyer', 'seller', 'both'));
alter table public.contacts add column if not exists listing_address text;
alter table public.contacts add column if not exists listing_timeline text
  check (listing_timeline in ('asap', '1_3_months', '3_6_months', '6_12_months', '12_plus_months', 'just_browsing', 'unknown'));
update public.contacts set representing = 'seller' where contact_type = 'seller' and representing is null;
update public.contacts set representing = 'both' where contact_type = 'both' and representing is null;
update public.contacts set representing = 'buyer' where contact_type in ('buyer', 'investor', 'renter', 'past_client') and representing is null;
alter table public.contacts add column if not exists unsubscribe_token uuid unique;
update public.contacts set unsubscribe_token = gen_random_uuid() where unsubscribe_token is null;
alter table public.contacts alter column unsubscribe_token set not null;
alter table public.contacts alter column unsubscribe_token set default gen_random_uuid();
alter table public.contacts add column if not exists quo_synced_at timestamptz;
alter table public.contacts add column if not exists dialer_contacted_at timestamptz;
alter table public.contacts add column if not exists dialer_snoozed_at timestamptz;
create index if not exists contacts_dialer_idx on public.contacts(owner_id, dialer_contacted_at) where archived = false;
alter table public.contacts add column if not exists event_followup_contacted_at timestamptz;
alter table public.contacts add column if not exists event_followup_snoozed_at timestamptz;
create index if not exists contacts_event_followup_idx on public.contacts(owner_id, event_followup_contacted_at) where archived = false;

-- ---------------------------------------------------------------------------
-- contact_tags
-- ---------------------------------------------------------------------------
create table if not exists public.contact_tags (
  contact_id uuid not null references public.contacts(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (contact_id, tag_id)
);

-- ---------------------------------------------------------------------------
-- activities
-- ---------------------------------------------------------------------------
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  type text not null
    check (type in ('call', 'text', 'email', 'note', 'meeting', 'showing', 'status_change', 'task_completed', 'system')),
  direction text not null default 'none' check (direction in ('inbound', 'outbound', 'none')),
  body text,
  occurred_at timestamptz not null default now(),
  source text not null default 'manual'
    check (source in ('manual', 'quo', 'gmail', 'calendly', 'eventbrite', 'jotform', 'ai', 'system')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists activities_contact_idx on public.activities(contact_id, occurred_at desc);
create index if not exists activities_owner_idx on public.activities(owner_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz,
  completed_at timestamptz,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  created_at timestamptz not null default now()
);
create index if not exists tasks_owner_due_idx on public.tasks(owner_id, due_at) where completed_at is null;
create index if not exists tasks_contact_idx on public.tasks(contact_id);

-- ---------------------------------------------------------------------------
-- important_dates
-- ---------------------------------------------------------------------------
create table if not exists public.important_dates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  label text not null,
  date date not null,
  recurring boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists important_dates_owner_idx on public.important_dates(owner_id, date);

-- ---------------------------------------------------------------------------
-- ai_insights
-- ---------------------------------------------------------------------------
create table if not exists public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  summary text not null,
  suggested_action text,
  confidence numeric,
  dismissed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists ai_insights_contact_idx on public.ai_insights(contact_id, created_at desc);
alter table public.ai_insights add column if not exists suggested_stage_id uuid references public.pipeline_stages(id) on delete set null;
alter table public.ai_insights add column if not exists suggested_timeline text
  check (suggested_timeline in ('asap', '1_3_months', '3_6_months', '6_12_months', '12_plus_months', 'just_browsing', 'unknown'));
alter table public.ai_insights add column if not exists applied boolean not null default false;

-- ---------------------------------------------------------------------------
-- RLS + policies (base tables)
-- ---------------------------------------------------------------------------
alter table public.pipeline_stages enable row level security;
alter table public.tags enable row level security;
alter table public.contacts enable row level security;
alter table public.contact_tags enable row level security;
alter table public.activities enable row level security;
alter table public.tasks enable row level security;
alter table public.important_dates enable row level security;
alter table public.ai_insights enable row level security;

drop policy if exists "owner full access" on public.pipeline_stages;
create policy "owner full access" on public.pipeline_stages for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "owner full access" on public.tags;
create policy "owner full access" on public.tags for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "owner full access" on public.contacts;
create policy "owner full access" on public.contacts for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "owner full access" on public.activities;
create policy "owner full access" on public.activities for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "owner full access" on public.tasks;
create policy "owner full access" on public.tasks for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "owner full access" on public.important_dates;
create policy "owner full access" on public.important_dates for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "owner full access" on public.ai_insights;
create policy "owner full access" on public.ai_insights for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "owner full access via contact" on public.contact_tags;
create policy "owner full access via contact" on public.contact_tags for all
  using (exists (select 1 from public.contacts c where c.id = contact_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.contacts c where c.id = contact_id and c.owner_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- New-user defaults (final version, matching migration 0010)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.pipeline_stages (owner_id, name, color, sort_order, is_closed_won, is_closed_lost, is_trash, is_under_contract) values
    (new.id, 'New Lead',        '#3b82f6', 0, false, false, false, false),
    (new.id, 'Contacted',       '#6366f1', 1, false, false, false, false),
    (new.id, 'Nurturing',       '#a855f7', 2, false, false, false, false),
    (new.id, 'Hot / Ready',     '#f97316', 3, false, false, false, false),
    (new.id, 'Under Contract',  '#f59e0b', 4, false, false, false, true),
    (new.id, 'Closed - Client', '#22c55e', 5, true,  false, false, false),
    (new.id, 'Past Client',     '#14b8a6', 6, true,  false, false, false),
    (new.id, 'Lost / Not Now',  '#94a3b8', 7, false, true,  false, false),
    (new.id, 'Trash',           '#d4d4d4', 8, false, false, true,  false);

  insert into public.tags (owner_id, name, color) values
    (new.id, 'VIP', '#f97316'),
    (new.id, 'First-Time Buyer', '#3b82f6'),
    (new.id, 'Cash Buyer', '#22c55e'),
    (new.id, 'Investor', '#a855f7'),
    (new.id, 'Referral Partner', '#14b8a6'),
    (new.id, 'Meetup', '#ec4899'),
    (new.id, 'Sphere', '#6366f1');

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- metric_goals
-- ---------------------------------------------------------------------------
create table if not exists public.metric_goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  metric_key text not null check (metric_key in ('speed_to_lead', 'contacted_pct', 'follow_up_rate', 'conversion_rate')),
  target_value numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, metric_key)
);
alter table public.metric_goals enable row level security;
drop policy if exists "owner full access" on public.metric_goals;
create policy "owner full access" on public.metric_goals for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop trigger if exists metric_goals_set_updated_at on public.metric_goals;
create trigger metric_goals_set_updated_at before update on public.metric_goals for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- deals
-- ---------------------------------------------------------------------------
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete cascade,
  stage_id uuid references public.pipeline_stages(id) on delete set null,
  closed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists deals_contact_idx on public.deals(contact_id);
create index if not exists deals_owner_idx on public.deals(owner_id, closed_at desc);
alter table public.deals enable row level security;
drop policy if exists "owner full access" on public.deals;
create policy "owner full access" on public.deals for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table public.deals add column if not exists address text;
alter table public.deals add column if not exists property_type text
  check (property_type in ('primary_residence', 'house_hack', 'investment', 'co_living', 'other'));
alter table public.deals add column if not exists side text check (side in ('buyer', 'seller'));
alter table public.deals add column if not exists sale_price numeric;
alter table public.deals add column if not exists lead_started_at timestamptz;
alter table public.deals add column if not exists notes text;

-- commission_amount was renamed to gross_commission in migration 0009 -
-- handle every possible starting state (neither column, old name only, or
-- already-renamed) without erroring.
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='deals' and column_name='gross_commission')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='deals' and column_name='commission_amount') then
    alter table public.deals add column commission_amount numeric;
  end if;
end $$;
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='deals' and column_name='commission_amount')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='deals' and column_name='gross_commission') then
    alter table public.deals rename column commission_amount to gross_commission;
  end if;
end $$;
alter table public.deals add column if not exists gross_commission numeric;

alter table public.deals add column if not exists referral_pct numeric;
alter table public.deals add column if not exists misc_fee numeric not null default 0;
alter table public.deals add column if not exists oz_fee numeric not null default 0;
alter table public.deals add column if not exists status text not null default 'won' check (status in ('pending', 'won'));
alter table public.deals alter column contact_id drop not null;
alter table public.deals add column if not exists client_name text;
alter table public.deals add column if not exists on_fmls boolean not null default true;
alter table public.deals add column if not exists manual_split boolean not null default false;
alter table public.deals add column if not exists kw_fee numeric;
alter table public.deals add column if not exists kwri_fee numeric;
alter table public.deals add column if not exists fmls_fee numeric;
alter table public.deals add column if not exists tc_fee numeric;
alter table public.deals add column if not exists referral_fee numeric;
alter table public.deals add column if not exists expected_closing_date date;

-- ---------------------------------------------------------------------------
-- gmail_accounts
-- ---------------------------------------------------------------------------
create table if not exists public.gmail_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade unique,
  email_address text not null,
  access_token text not null,
  refresh_token text not null,
  token_expiry timestamptz not null,
  last_history_id text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.gmail_accounts enable row level security;
drop policy if exists "owner full access" on public.gmail_accounts;
create policy "owner full access" on public.gmail_accounts for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop trigger if exists gmail_accounts_set_updated_at on public.gmail_accounts;
create trigger gmail_accounts_set_updated_at before update on public.gmail_accounts for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- email sequences
-- ---------------------------------------------------------------------------
create table if not exists public.email_sequences (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('broadcast', 'drip')),
  target_tag_id uuid references public.tags(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists email_sequences_owner_idx on public.email_sequences(owner_id);
alter table public.email_sequences add column if not exists description text;
alter table public.email_sequences drop constraint if exists email_sequences_type_check;
alter table public.email_sequences add constraint email_sequences_type_check
  check (type in ('broadcast', 'drip', 'batch'));

create table if not exists public.email_sequence_steps (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.email_sequences(id) on delete cascade,
  step_order int not null,
  subject text not null,
  body text not null,
  send_at timestamptz,
  delay_amount int,
  delay_unit text check (delay_unit in ('hours', 'days')),
  created_at timestamptz not null default now(),
  unique (sequence_id, step_order)
);
create index if not exists email_sequence_steps_sequence_idx on public.email_sequence_steps(sequence_id, step_order);
alter table public.email_sequence_steps add column if not exists active boolean not null default true;

create table if not exists public.email_sequence_enrollments (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.email_sequences(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  current_step int not null default 0,
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  unique (sequence_id, contact_id)
);
create index if not exists email_sequence_enrollments_due_idx on public.email_sequence_enrollments(sequence_id, status);
alter table public.email_sequence_enrollments drop constraint if exists email_sequence_enrollments_status_check;
alter table public.email_sequence_enrollments add constraint email_sequence_enrollments_status_check
  check (status in ('active', 'paused', 'completed'));

create table if not exists public.email_sequence_sends (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.email_sequences(id) on delete cascade,
  step_id uuid not null references public.email_sequence_steps(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  sent_at timestamptz not null default now(),
  opened_at timestamptz,
  open_count int not null default 0,
  clicked_at timestamptz,
  click_count int not null default 0,
  unsubscribed_at timestamptz,
  unique (step_id, contact_id)
);
create index if not exists email_sequence_sends_step_idx on public.email_sequence_sends(step_id);
create index if not exists email_sequence_sends_contact_idx on public.email_sequence_sends(contact_id);

create table if not exists public.email_sequence_exclusions (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.email_sequences(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  excluded_at timestamptz not null default now(),
  unique (sequence_id, contact_id)
);

alter table public.email_sequences enable row level security;
alter table public.email_sequence_steps enable row level security;
alter table public.email_sequence_enrollments enable row level security;
alter table public.email_sequence_sends enable row level security;
alter table public.email_sequence_exclusions enable row level security;

drop policy if exists "owner full access" on public.email_sequences;
create policy "owner full access" on public.email_sequences for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "owner full access via sequence" on public.email_sequence_steps;
create policy "owner full access via sequence" on public.email_sequence_steps for all
  using (exists (select 1 from public.email_sequences s where s.id = sequence_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.email_sequences s where s.id = sequence_id and s.owner_id = auth.uid()));

drop policy if exists "owner full access via sequence" on public.email_sequence_enrollments;
create policy "owner full access via sequence" on public.email_sequence_enrollments for all
  using (exists (select 1 from public.email_sequences s where s.id = sequence_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.email_sequences s where s.id = sequence_id and s.owner_id = auth.uid()));

drop policy if exists "owner full access via sequence" on public.email_sequence_sends;
create policy "owner full access via sequence" on public.email_sequence_sends for all
  using (exists (select 1 from public.email_sequences s where s.id = sequence_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.email_sequences s where s.id = sequence_id and s.owner_id = auth.uid()));

drop policy if exists "owner full access via sequence" on public.email_sequence_exclusions;
create policy "owner full access via sequence" on public.email_sequence_exclusions for all
  using (exists (select 1 from public.email_sequences s where s.id = sequence_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.email_sequences s where s.id = sequence_id and s.owner_id = auth.uid()));

create or replace function public.handle_new_contact_tag()
returns trigger as $$
begin
  insert into public.email_sequence_enrollments (sequence_id, contact_id)
  select s.id, new.contact_id
  from public.email_sequences s
  where s.type = 'drip' and s.active = true and s.target_tag_id = new.tag_id
  on conflict (sequence_id, contact_id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_contact_tag_added on public.contact_tags;
create trigger on_contact_tag_added after insert on public.contact_tags for each row execute function public.handle_new_contact_tag();

create or replace function public.handle_removed_contact_tag()
returns trigger as $$
begin
  delete from public.email_sequence_enrollments e
  using public.email_sequences s
  where e.sequence_id = s.id
    and s.type = 'drip'
    and s.target_tag_id = old.tag_id
    and e.contact_id = old.contact_id
    and e.status = 'active';
  return old;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_contact_tag_removed on public.contact_tags;
create trigger on_contact_tag_removed after delete on public.contact_tags for each row execute function public.handle_removed_contact_tag();

-- ---------------------------------------------------------------------------
-- gmail_oauth_states
-- ---------------------------------------------------------------------------
create table if not exists public.gmail_oauth_states (
  state text primary key,
  created_at timestamptz not null default now()
);
alter table public.gmail_oauth_states enable row level security;

-- ---------------------------------------------------------------------------
-- contact_segments
-- ---------------------------------------------------------------------------
create table if not exists public.contact_segments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  filters jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists contact_segments_owner_idx on public.contact_segments(owner_id);
alter table public.contact_segments enable row level security;
drop policy if exists "owner full access" on public.contact_segments;
create policy "owner full access" on public.contact_segments for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- merge_contacts function
-- ---------------------------------------------------------------------------
create or replace function public.merge_contacts(keep_id uuid, merge_id uuid, actor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if keep_id = merge_id then
    raise exception 'Cannot merge a contact into itself';
  end if;

  perform 1 from public.contacts where id = keep_id and owner_id = actor_id;
  if not found then
    raise exception 'Contact % not found for this owner', keep_id;
  end if;
  perform 1 from public.contacts where id = merge_id and owner_id = actor_id;
  if not found then
    raise exception 'Contact % not found for this owner', merge_id;
  end if;

  update public.contacts k
  set
    email = coalesce(k.email, m.email),
    phone = coalesce(k.phone, m.phone),
    secondary_phone = coalesce(k.secondary_phone, nullif(m.phone, k.phone), nullif(m.secondary_phone, k.phone)),
    contact_type = coalesce(k.contact_type, m.contact_type),
    representing = coalesce(k.representing, m.representing),
    listing_address = coalesce(k.listing_address, m.listing_address),
    listing_timeline = coalesce(k.listing_timeline, m.listing_timeline),
    stage_id = coalesce(k.stage_id, m.stage_id),
    lead_source = coalesce(k.lead_source, m.lead_source),
    budget_min = coalesce(k.budget_min, m.budget_min),
    budget_max = coalesce(k.budget_max, m.budget_max),
    areas_of_interest = (select array(select distinct unnest(k.areas_of_interest || m.areas_of_interest))),
    timeline = case when k.timeline = 'unknown' then m.timeline else k.timeline end,
    next_follow_up_at = least(k.next_follow_up_at, m.next_follow_up_at),
    birthday = coalesce(k.birthday, m.birthday),
    address_line1 = coalesce(k.address_line1, m.address_line1),
    address_line2 = coalesce(k.address_line2, m.address_line2),
    city = coalesce(k.city, m.city),
    state = coalesce(k.state, m.state),
    postal_code = coalesce(k.postal_code, m.postal_code),
    last_event_name = case when m.last_event_at is not null and (k.last_event_at is null or m.last_event_at > k.last_event_at)
                        then m.last_event_name else k.last_event_name end,
    last_event_at = greatest(k.last_event_at, m.last_event_at),
    ai_last_status_note = case when m.ai_last_analyzed_at is not null and (k.ai_last_analyzed_at is null or m.ai_last_analyzed_at > k.ai_last_analyzed_at)
                            then m.ai_last_status_note else k.ai_last_status_note end,
    ai_last_analyzed_at = greatest(k.ai_last_analyzed_at, m.ai_last_analyzed_at),
    quo_synced_at = coalesce(k.quo_synced_at, m.quo_synced_at),
    dialer_contacted_at = greatest(k.dialer_contacted_at, m.dialer_contacted_at),
    dialer_snoozed_at = greatest(k.dialer_snoozed_at, m.dialer_snoozed_at),
    event_followup_contacted_at = greatest(k.event_followup_contacted_at, m.event_followup_contacted_at),
    event_followup_snoozed_at = greatest(k.event_followup_snoozed_at, m.event_followup_snoozed_at),
    notes = nullif(trim(both E'\n' from
      coalesce(k.notes, '') ||
      case when m.notes is not null and m.notes <> '' then
        (case when coalesce(k.notes, '') <> '' then E'\n\n' else '' end) || '[Merged from duplicate contact] ' || m.notes
      else '' end
    ), '')
  from public.contacts m
  where k.id = keep_id and m.id = merge_id;

  insert into public.contact_tags (contact_id, tag_id)
  select keep_id, tag_id from public.contact_tags where contact_id = merge_id
  on conflict (contact_id, tag_id) do nothing;
  delete from public.contact_tags where contact_id = merge_id;

  update public.activities set contact_id = keep_id where contact_id = merge_id;
  update public.tasks set contact_id = keep_id where contact_id = merge_id;
  update public.important_dates set contact_id = keep_id where contact_id = merge_id;
  update public.ai_insights set contact_id = keep_id where contact_id = merge_id;
  update public.deals set contact_id = keep_id where contact_id = merge_id;

  delete from public.email_sequence_enrollments e
  where e.contact_id = merge_id
    and exists (select 1 from public.email_sequence_enrollments k2 where k2.contact_id = keep_id and k2.sequence_id = e.sequence_id);
  update public.email_sequence_enrollments set contact_id = keep_id where contact_id = merge_id;

  delete from public.email_sequence_sends s
  where s.contact_id = merge_id
    and exists (select 1 from public.email_sequence_sends k2 where k2.contact_id = keep_id and k2.step_id = s.step_id);
  update public.email_sequence_sends set contact_id = keep_id where contact_id = merge_id;

  delete from public.email_sequence_exclusions x
  where x.contact_id = merge_id
    and exists (select 1 from public.email_sequence_exclusions k2 where k2.contact_id = keep_id and k2.sequence_id = x.sequence_id);
  update public.email_sequence_exclusions set contact_id = keep_id where contact_id = merge_id;

  delete from public.contacts where id = merge_id;
end;
$$;
grant execute on function public.merge_contacts(uuid, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- push_subscriptions
-- ---------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_owner_idx on public.push_subscriptions(owner_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists "owner full access" on public.push_subscriptions;
create policy "owner full access" on public.push_subscriptions for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- email_link_clicks
-- ---------------------------------------------------------------------------
create table if not exists public.email_link_clicks (
  id uuid primary key default gen_random_uuid(),
  send_id uuid not null references public.email_sequence_sends(id) on delete cascade,
  url text not null,
  clicked_at timestamptz not null default now()
);
create index if not exists email_link_clicks_send_idx on public.email_link_clicks(send_id);
create index if not exists email_link_clicks_url_idx on public.email_link_clicks(url);
alter table public.email_link_clicks enable row level security;
drop policy if exists "owner full access via send" on public.email_link_clicks;
create policy "owner full access via send" on public.email_link_clicks
  for all
  using (exists (
    select 1 from public.email_sequence_sends snd
    join public.email_sequences s on s.id = snd.sequence_id
    where snd.id = send_id and s.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.email_sequence_sends snd
    join public.email_sequences s on s.id = snd.sequence_id
    where snd.id = send_id and s.owner_id = auth.uid()
  ));

-- ============================================================================
-- Done. Every table/column/index/policy/trigger/function through migration
-- 0025 now exists, regardless of what did or didn't run before.
-- ============================================================================
