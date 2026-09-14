-- Events don't exist as records today - getEventsData() derives them by
-- bucketing eventbrite/checkin/jotform activities, so an event only
-- exists once someone registers or checks in, and its date is a proxy
-- (real Eventbrite start times have never come back from their API).
-- This table gives an event a real start/end time from the moment it's
-- created, independent of any registration activity - what makes the
-- Next up prep card, the New event button, and an honest "Didn't come"
-- (only after the event has actually ended) possible.
--
-- eventbrite_event_id links this row to the activities bucket once
-- registrations start arriving (lib/data/events.ts's eventKey) - null
-- until then, and for series with no Eventbrite listing at all.
create table public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  series text not null,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  eventbrite_event_id text,
  created_at timestamptz not null default now()
);

create index events_owner_starts_idx on public.events (owner_id, starts_at);
create unique index events_owner_eventbrite_id_idx on public.events (owner_id, eventbrite_event_id) where eventbrite_event_id is not null;

alter table public.events enable row level security;
create policy "owner full access" on public.events
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
