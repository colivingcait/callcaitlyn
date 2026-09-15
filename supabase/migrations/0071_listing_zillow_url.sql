-- The Zillow listing URL - dropped straight into agent texts/copy so an
-- agent can tap through and see photos immediately, rather than asking
-- her to describe the place or dig up the FMLS listing themselves.
alter table public.listings add column zillow_url text;
