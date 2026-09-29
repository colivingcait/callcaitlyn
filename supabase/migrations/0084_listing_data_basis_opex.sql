-- Offering-memorandum OpEx data basis. 'actual' is the historical page.
-- 'projected' labels OpEx / NOI / cap rate / cash-on-cash and shows the
-- buyer-facing note until the seller T12 is in. Application code treats a
-- missing column (deploy before this file runs) as actual and strips these
-- keys from updates when PostgREST reports them unknown.

alter table public.listings
  add column if not exists data_basis_opex text default 'actual';

alter table public.listings
  add column if not exists data_basis_opex_note text;

alter table public.listings drop constraint if exists listings_data_basis_opex_check;

alter table public.listings
  add constraint listings_data_basis_opex_check
  check (data_basis_opex is null or data_basis_opex in ('actual', 'projected'));
