-- New revenue stream: Caitlyn can't earn commission from other agents,
-- but she does get a referral fee from her team lead/brokerage when an
-- agent she connects them with actually joins the office. Deliberately a
-- separate table, not a new contacts.contact_type - these aren't clients
-- (no budget/timeline/areas_of_interest/representing has any meaning
-- here), and every existing report/dashboard that iterates contacts
-- would otherwise need to remember to exclude them. A fixed stage set
-- (not a second editable pipeline_stages-style table) since the real
-- workflow she described has exactly these steps, and this is low
-- enough volume that a custom stage builder would be overhead she'd
-- never use.
create table public.agent_recruits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null default '',
  phone text,
  email text,
  current_brokerage text,
  notes text,
  stage text not null default 'introduced' check (
    stage in ('introduced', 'connected_with_lead', 'joined', 'fee_received', 'not_moving_forward')
  ),
  -- The referral fee amount is often not known/agreed until later in the
  -- conversation - nullable, filled in whenever she actually knows it.
  referral_fee numeric,
  joined_at timestamptz,
  fee_received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index agent_recruits_owner_stage_idx on public.agent_recruits(owner_id, stage);

alter table public.agent_recruits enable row level security;
create policy "owner full access" on public.agent_recruits
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
