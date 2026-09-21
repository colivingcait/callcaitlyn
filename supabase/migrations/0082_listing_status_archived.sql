-- listings.status is now exactly four values:
--   coming_soon | active | under_contract | archived
--
-- Legacy mapping (Caitlyn Apply — run this file in the Supabase SQL editor
-- or `supabase db push` before the new CRM/public listing code ships):
--   coming_soon     → coming_soon     (unchanged)
--   active          → active          (unchanged)
--   under_contract  → under_contract  (unchanged)
--   closed          → archived
--   sold            → archived
--   inactive        → archived
--   any other leftover → archived
--
-- listing_status_changes has no check constraint; history is remapped the
-- same way so Activity labels stay on the four current names.
--
-- Recently sold on public /listing stays deals-based (won deals). Archived
-- listings are not added to that strip.

do $$
declare
  rec record;
begin
  for rec in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'listings'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ~* 'status'
      and pg_get_constraintdef(con.oid) ~* 'coming_soon'
  loop
    execute format('alter table public.listings drop constraint %I', rec.conname);
  end loop;
end $$;

update public.listings
  set status = case lower(status)
    when 'coming_soon' then 'coming_soon'
    when 'active' then 'active'
    when 'under_contract' then 'under_contract'
    when 'archived' then 'archived'
    else 'archived'
  end
  where status is distinct from case lower(status)
    when 'coming_soon' then 'coming_soon'
    when 'active' then 'active'
    when 'under_contract' then 'under_contract'
    when 'archived' then 'archived'
    else 'archived'
  end;

update public.listing_status_changes
  set old_status = 'archived'
  where old_status is not null
    and lower(old_status) not in ('coming_soon', 'active', 'under_contract', 'archived');

update public.listing_status_changes
  set new_status = 'archived'
  where lower(new_status) not in ('coming_soon', 'active', 'under_contract', 'archived');

alter table public.listings
  add constraint listings_status_check
  check (status in ('coming_soon', 'active', 'under_contract', 'archived'));
