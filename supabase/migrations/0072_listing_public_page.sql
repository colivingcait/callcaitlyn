-- A public "own Zillow" marketing page per listing, for listings that
-- won't be on the MLS (so there's no real Zillow page to link agents to).
-- public_slug null = no public page yet; set it to publish one at
-- /listing/<slug>. padsplit_* columns hold the daily scrape's current
-- state (no history table - only "now" is shown on the page).
alter table public.listings add column public_slug text unique;
alter table public.listings add column padsplit_url text;
alter table public.listings add column occupied_rooms integer;
alter table public.listings add column total_rooms integer;
alter table public.listings add column price_low numeric;
alter table public.listings add column price_high numeric;
alter table public.listings add column padsplit_photo_urls jsonb;
alter table public.listings add column last_scraped_at timestamptz;
alter table public.listings add column last_scrape_error text;

-- The two files the public page's gate sends out (earnings statement,
-- T12) - one row per doc type per listing, re-upload replaces it rather
-- than accumulating old versions.
create table public.listing_documents (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  doc_type text not null check (doc_type in ('earnings_statement', 't12')),
  storage_path text not null,
  uploaded_at timestamptz not null default now(),
  unique (listing_id, doc_type)
);

create index listing_documents_listing_idx on public.listing_documents(listing_id);

alter table public.listing_documents enable row level security;
create policy "owner full access" on public.listing_documents
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- The "listing-documents" bucket itself is created by hand in the
-- Supabase dashboard (Storage -> New bucket -> PRIVATE, unlike
-- listing-photos) - same as migration 0069/0070's listing-photos bucket,
-- this step alone adds no RLS policies. Unlike listing-photos, there is
-- deliberately no public select policy here: these are financial
-- documents, so visitors only ever reach a file through a short-lived
-- signed URL the server generates with the service-role client (which
-- bypasses RLS entirely), never through a public bucket URL.
create policy "authenticated can manage listing documents"
on storage.objects for all
to authenticated
using (bucket_id = 'listing-documents')
with check (bucket_id = 'listing-documents');
