-- #34 set photo_source = 'padsplit' only where padsplit_photos was already
-- non-null. A PadSplit ID saved after that stayed on the manual default, so
-- public cards and the OM ignored the scrape cache (The Conley Eight:
-- occupancy updated, cover empty). The curated gallery was also never
-- filled, so the Photos tab still said it had not been pulled.
--
-- One-shot, same rules as the app: copy non-exterior scrape photos into
-- padsplit_gallery when that gallery is still empty, and publish the
-- PadSplit source only when she has no uploads. Do not touch hero_photo_url
-- or a gallery she already saved.
update public.listings
set
  padsplit_gallery = (
    select coalesce(jsonb_agg(photo order by ord), '[]'::jsonb)
    from jsonb_array_elements(padsplit_photos) with ordinality as t(photo, ord)
    where not (
      coalesce(photo->>'category', '') || ' ' ||
      coalesce(photo->>'alt', '') || ' ' ||
      coalesce(photo->>'title', '') || ' ' ||
      coalesce(photo->>'url', '') || ' ' ||
      coalesce(photo->>'tags', '')
    ) ~* 'exterior|outside|front|facade|façade|curb|back|yard|street|driveway|porch|roof'
  ),
  photo_source = case
    when photo_source = 'manual' and coalesce(cardinality(photo_paths), 0) = 0 then 'padsplit'
    else photo_source
  end
where padsplit_url is not null
  and padsplit_photos is not null
  and jsonb_typeof(padsplit_photos) = 'array'
  and jsonb_array_length(padsplit_photos) > 0
  and (
    padsplit_gallery is null
    or jsonb_typeof(padsplit_gallery) <> 'array'
    or jsonb_array_length(padsplit_gallery) = 0
  );
