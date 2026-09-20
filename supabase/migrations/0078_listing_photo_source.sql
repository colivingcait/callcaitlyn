-- Public OM photo source: Caitlyn picks uploaded gallery OR a curated
-- PadSplit snapshot. Daily scrape still writes occupancy/pricing and the
-- raw padsplit_photos cache (source for the next one-shot Pull). It must
-- never write these columns — curated order, hero, and source stay put.
alter table public.listings
  add column photo_source text not null default 'manual'
    check (photo_source in ('manual', 'padsplit'));

alter table public.listings
  add column hero_photo_url text;

-- Ordered curated PadSplit interiors. Null/empty = not pulled yet; public
-- padsplit mode then falls back to last-scrape interiors so existing OMs
-- do not go blank before the first Pull.
alter table public.listings
  add column padsplit_gallery jsonb;

-- Listings already publishing scrape interiors keep that source.
-- Uploads-only rows stay on manual (the column default).
update public.listings
  set photo_source = 'padsplit'
  where padsplit_photos is not null;
