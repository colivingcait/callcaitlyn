-- Seeds the two new tags used by the Eventbrite/Jotform journey-stage
-- mapping. Safe to re-run.

insert into public.tags (owner_id, name, color)
select u.id, 'House Hacking', '#0ea5e9'
from auth.users u
where not exists (
  select 1 from public.tags t where t.owner_id = u.id and t.name = 'House Hacking'
);

insert into public.tags (owner_id, name, color)
select u.id, 'House Hacker', '#8b5cf6'
from auth.users u
where not exists (
  select 1 from public.tags t where t.owner_id = u.id and t.name = 'House Hacker'
);
