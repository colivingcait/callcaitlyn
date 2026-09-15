-- The "listing-photos" bucket itself only gets created by hand in the
-- Supabase dashboard (Storage -> New bucket -> public) - that step alone
-- does not add any row-level security policies on storage.objects, so an
-- upload from the browser (PhotoUploader.tsx, using the signed-in user's
-- own session) fails with "new row violates row-level security policy"
-- until these exist. Single-tenant app - any authenticated user is this
-- CRM's one owner, so bucket_id is the only check that matters here.

create policy "authenticated can manage listing photos"
on storage.objects for all
to authenticated
using (bucket_id = 'listing-photos')
with check (bucket_id = 'listing-photos');

-- Explicit read policy too, in case the dashboard's "Public" toggle on
-- its own doesn't bypass RLS for every Supabase project version - the
-- marketing graphics and photo grid both load these by public URL.
create policy "public can view listing photos"
on storage.objects for select
using (bucket_id = 'listing-photos');
