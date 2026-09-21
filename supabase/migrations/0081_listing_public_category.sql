-- Public listings index tag. listings.property_type stays free text (the OM
-- "PROPERTY TYPE" cell — "Legal duplex", etc.). deals.property_type stays
-- the CRM enum. This column is the only source for Coliving / AirBnB /
-- Long Term Rental / Primary Residence tags on /listing — do not infer
-- those from free text at render time.
--
-- Caitlyn Apply: run this file in the Supabase SQL editor (or `supabase db
-- push`) before the redesigned /listing page can read public_category.
-- Existing rows with a public_slug are backfilled to coliving because every
-- published listing today is an OM offering.

alter table public.listings
  add column if not exists public_category text
  check (public_category is null or public_category in (
    'coliving',
    'airbnb',
    'long_term_rental',
    'primary_residence'
  ));

update public.listings
  set public_category = 'coliving'
  where public_category is null
    and public_slug is not null;
