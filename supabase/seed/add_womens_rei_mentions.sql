-- One-time content update, not a schema migration - run once, after
-- house_hacking_sequences.sql has already been run. Adds a mention of the
-- separate Women's Real Estate Investing meetup (same venue, 6:30-9pm, but
-- the 4th Tuesday instead of the 2nd, with rotating unset topics so it
-- doesn't get its own tracked sequence) into existing copy - per request,
-- no new emails/steps, just worked into what's already there.

-- Sequence B (House Hacking Content): every one of the 26 emails shares
-- one identical signature block, so a single replace() touches all of
-- them at once - adds one more link line to that block.
update public.email_sequence_steps s
set body = replace(
  s.body,
  $old$<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Meet us in person →</a>
<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Got questions? Let's chat →</a>$old$,
  $new$<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Meet us in person →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI meetup, 4th Tuesdays →</a>
<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Got questions? Let's chat →</a>$new$
)
from public.email_sequences seq
where seq.id = s.sequence_id and seq.name = 'House Hacking Content';

-- Sequence A (Meetup Reminders): only the 8 recap (A5) emails end with a
-- bare "Caitlyn" sign-off before the tagline (the other four step types
-- per event use "Caitlyn Verdugo" or have no tagline at all) - unique
-- enough to target directly without needing to know exact step_order
-- values. Rows where the pattern doesn't match (the other 32 steps) are
-- left untouched - replace() is a no-op when there's nothing to replace.
update public.email_sequence_steps s
set body = replace(
  s.body,
  $old2$Caitlyn

Every door is an opportunity. 🚪$old2$,
  $new2$Caitlyn

P.S. — we also run a Women's Real Estate Investing meetup, same place, 4th Tuesdays. <a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Details →</a>

Every door is an opportunity. 🚪$new2$
)
from public.email_sequences seq
where seq.id = s.sequence_id and seq.name = 'Meetup Reminders';

-- Sanity check - run this after and confirm: all 26 "House Hacking
-- Content" rows show true, and exactly 8 "Meetup Reminders" rows
-- (step_order 4, 9, 14, 19, 24, 29, 34, 39 - the recap emails) show true.
select seq.name, s.step_order, (s.body like '%Women%REI%' or s.body like '%Women''s Real Estate%') as mentions_womens_rei
from public.email_sequence_steps s
join public.email_sequences seq on seq.id = s.sequence_id
where seq.name in ('House Hacking Content', 'Meetup Reminders')
order by seq.name, s.step_order;
