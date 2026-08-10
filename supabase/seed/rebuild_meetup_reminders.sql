-- One-time content rebuild, not a schema migration. Run once, after
-- house_hacking_sequences.sql and add_womens_rei_mentions.sql have already
-- been run. Replaces all steps of the "Meetup Reminders" sequence with 42:
-- previously every email promoted House Hacking only; now the same single
-- list gets a mix, roughly 65% House Hacking / 35% Women's REI, with every
-- email's sign-off linking both. House Hacking send dates are unchanged
-- from the original build (same Tue/Wed cadence, same two holiday
-- overrides) - only which topic each slot leads with, and the closing
-- signature, changed. Two new steps (Aug 18 and Aug 24) promote the
-- specific August 25 Women's REI meetup (Anika Uboh, "Inside a 250-Home
-- Neighborhood") ahead of the recurring, topic-agnostic mentions used for
-- every occurrence after that one.
--
-- Deleting and re-inserting is safe here: this sequence's first send date
-- is still in the future as of when this script is written, so no real
-- send/open/click history exists yet to lose.
delete from public.email_sequence_steps s
using public.email_sequences seq
where seq.id = s.sequence_id and seq.name = 'Meetup Reminders';

with owner as (select id from auth.users limit 1),
     tag as (select t.id from public.tags t, owner o where t.owner_id = o.id and t.name = 'Meetup'),
     seq as (select id from public.email_sequences where name = 'Meetup Reminders')
insert into public.email_sequence_steps (sequence_id, step_order, subject, body, send_at, active)
select seq.id, v.step_order, v.subject, v.body, (v.local_time::timestamp at time zone 'America/New_York'), true
from seq, (values

-- ---------- ANNOUNCEMENT TRIO (both meetups) ----------
(0, $$Exciting news — a second monthly meetup$$, $$Hi {{first_name}},

Exciting news! By popular demand, we're adding a second monthly meetup — this one specifically on house hacking, and open to everyone, men and women both.

Quick recap of what's now on the calendar every month:

Women's Real Estate Investing — 4th Tuesday, 6:30-9pm, topics rotate monthly. Next one is August 25. The room you already know.

House Hacking Atlanta — 2nd Tuesday, 6:30-9pm, brand new. First one is September 8: Financing a House Hack.

Same venue for both — New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306.

Go ahead and get both dates on your calendar now — details on each are coming as they get closer.

Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2026-08-12 10:00:00'),

-- ---------- AUGUST 25 WOMEN'S REI MEETUP: Inside a 250-Home Neighborhood ----------
(1, $$This month's Women's REI meetup: Inside a 250-Home Neighborhood$$, $$Hi {{first_name}},

Ladies, it's time to think bigger! This month's Women's Real Estate Investing meetup is coming up August 25, and it's a good one — an inside look at the making of a 250-home neighborhood.

Most real estate investors focus on rentals and flips. What if one larger-scale development could outperform dozens of individual investments?

Developer and entrepreneur Anika Uboh is joining us to share the story behind developing and selling a 250-home residential community in the suburbs of Atlanta — the strategy, partnerships, capital, and leadership it took to pull off, and the lessons investors at every stage can apply to their own journey.

Anika is a real estate developer, civil and environmental engineer, and entrepreneur who co-developed and sold that 250-home neighborhood. She's also the founder of EntrepreneurHER and the JUBOH Foundation, where she empowers women through education, leadership, and entrepreneurship.

Tuesday, August 25, 6:30-9pm, New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306.

<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Register →</a>

Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2026-08-18 10:00:00'),

(2, $$Tomorrow: Inside a 250-Home Neighborhood$$, $$Hi {{first_name}},

Tomorrow! Inside the Making of a 250-Home Neighborhood — our Women's Real Estate Investing meetup, 6:30pm.

Developer Anika Uboh will walk us through developing and selling a 250-home residential community in the Atlanta suburbs — the strategy, the partnerships, the capital, and what it took to lead. Whether you're years from anything this size or just curious what's possible beyond a single rental, there's something here for you.

New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306. Doors 6:30, program 7:00, open networking after.

<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Register →</a>

Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2026-08-24 10:00:00'),

(3, $$Two meetups now — here's how they're different$$, $$Hi {{first_name}},

Following up on the news — we're now running two monthly meetups instead of one, and I wanted to lay out how they're different so you know which one (or both!) is for you.

Women's Real Estate Investing meets the 4th Tuesday of every month. Topics rotate — some months it's financing, some months it's a specific deal someone's working through, sometimes it's just open discussion. It's a smaller room, built specifically for women investing in real estate.

House Hacking Atlanta meets the 2nd Tuesday, starting September 8 with Financing a House Hack. Open to everyone — men and women, first-timers and experienced investors. Same format each month: a short program on that month's topic, then open networking.

Come to one, come to both — whatever's useful. Both are free, both are at New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306.

Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2026-08-26 10:00:00'),

(4, $$Next Tuesday — the first House Hacking meetup$$, $$Hi {{first_name}},

The first-ever House Hacking Atlanta meetup is next Tuesday — Financing a House Hack, September 8, 6:30pm.

If you've ever thought you needed 20% down to buy something that produces income, this is the night that changes that.

This is a brand new meetup, so nobody's a regular yet — which makes it a great one to walk into, whether you're coming alone or bringing someone. Doors 6:30, program 7:00 to 7:30, then open networking until about 9.

New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register →</a>

And a reminder while it's on your mind — the Women's Real Estate Investing meetup is coming up September 22, same place. Worth getting on your calendar too.

Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2026-09-02 10:00:00'),

-- ---------- EVENT 1: Financing a House Hack - Tue Sep 8, 2026 ----------
(5, $$Tonight: Financing a House Hack$$, $$Hi {{first_name}},

Tonight! Financing a House Hack.

Doors at 6:30, program at 7:00, and we'll be around until about 9.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

Come hungry — the food's good and most people order a small plate and a couple drinks.

And stick around after the program. That's when everybody actually talks to each other, and it's the best part of the night!

Haven't registered? Doesn't matter — just come. Walk-ins are always welcome and there's always room.

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Directions →</a>

See you tonight,
Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2026-09-08 10:00:00'),

(6, $$Last night: the 5% down conversation$$, $$Hi {{first_name}},

What a good night. Thanks to everyone who came out — and to the folks who stuck around talking well past nine!

The thing I hope stuck: when you buy a property you're going to live in, you get terms an investor on that same house simply cannot get. A smaller down payment, a better rate, easier qualification. That gap is the entire engine behind house hacking, and most people have no idea it's available to them.

<strong>A question worth repeating:</strong> what happens if you move out before the occupancy period is up?

Worth knowing the real answer rather than guessing. Occupancy requirements are actual obligations, not technicalities — but the period is usually shorter than people assume, and once it's satisfied you can move out, rent the whole property, and use owner-occupant financing again on your next place. That sequence is how most people end up with a second property. Ask your lender for the specific period on your specific loan, in writing.

More on this here:
<a href="https://www.househackingatl.com/owner-occupant-financing-house-hacking">Why owner-occupant loans are the whole reason this works →</a>

Next month: Finding the Deal, Tuesday October 13. Same place, same time.

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register →</a>

See you next month,
Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2026-09-09 10:00:00'),

-- ---------- EVENT 2: Finding the Deal - Tue Oct 13, 2026 (save-the-date slot -> Women's REI) ----------
(7, $$This month's Women's REI meetup$$, $$Hi {{first_name}},

Quick reminder — our Women's Real Estate Investing meetup is coming up September 22, 6:30-9pm at New Realm Brewery.

Topics rotate every month, so it's never the same room twice — sometimes it's financing, sometimes it's a specific deal someone in the group is working through, sometimes it's just open Q&A. Come with whatever's actually on your mind.

<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Register →</a>

And don't forget — House Hacking Atlanta is up next too: Finding the Deal, Tuesday October 13. Same venue, 2nd Tuesday of the month, open to everyone.

Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2026-09-16 10:00:00'),

(8, $$Finding the Deal — next House Hacking Atlanta meetup$$, $$Hi {{first_name}},

Two weeks out — Finding the Deal, Tuesday October 13.

The houses that photograph best are often the hardest to house hack. We're getting specific about what actually works in the Atlanta metro — basements worth converting, layouts with real separation, and the details that quietly kill a deal after you've closed.

Here's how the night goes:
6:30  Doors — grab a drink and something to eat, say hi to a few people
7:00  Program, about 30 minutes including Q&A
7:30  Open networking until around 9

New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register on Eventbrite →</a>

Hope to see you,
Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2026-09-30 10:00:00'),

(9, $$Next Tuesday — Finding the Deal$$, $$Hi {{first_name}},

Finding the Deal is next Tuesday, and I'd love for you to come.

If you're actively looking, bring a listing. We'll talk through whether it actually works for your goals.

Doors 6:30, program 7:00 to 7:30, then we're around until about 9.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register →</a>

Really hope to see you there,
Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2026-10-07 10:00:00'),

(10, $$Tonight: Finding the Deal$$, $$Hi {{first_name}},

Tonight! Finding the Deal.

Doors at 6:30, program at 7:00, and we'll be around until about 9.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

Come hungry — the food's good and most people order a small plate and a couple drinks.

Haven't registered? Doesn't matter — just come. Walk-ins are always welcome and there's always room.

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Directions →</a>

See you tonight,
Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2026-10-13 10:00:00'),

(11, $$Last night: the houses that don't work$$, $$Hi {{first_name}},

What a great night — thank you so much to everyone who came out!

The through-line: separation beats square footage. The houses that photograph beautifully — open concept, wide sightlines, everything flowing together — are often the hardest to house hack. What actually works is the stuff that shows badly. Tri-levels, split levels, awkward multi-zone layouts where the geometry already puts distance between people.

<strong>A question worth repeating:</strong> is there a layout you'd walk away from no matter how good the price is?

Yes — a house where the only way to reach the rentable space is through your living room. You can still rent it, but it earns spare-bedroom rent, not separate-unit rent, and no discount fixes that.

More on this here:
<a href="https://www.househackingatl.com/what-makes-a-good-house-hack">What makes a good house hack →</a>

Speaking of the room — our Women's Real Estate Investing meetup is coming up October 27, same place. If you haven't been, it's a smaller, more discussion-driven group than House Hacking's — worth trying if you want more airtime for your specific questions.

<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Register →</a>

House Hacking's back next month too: Protecting Your House Hack, Tuesday November 10.

Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2026-10-14 10:00:00'),

-- ---------- EVENT 3: Protecting Your House Hack - Tue Nov 10, 2026 (save-the-date slot -> Women's REI) ----------
(12, $$This month's Women's REI meetup$$, $$Hi {{first_name}},

Our Women's Real Estate Investing meetup is coming up October 27 — 6:30-9pm, New Realm Brewery.

It's a smaller room than House Hacking on purpose. No explaining yourself, no being the only woman asking the question — just real conversation about whatever's actually on people's minds that month.

<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Register →</a>

House Hacking Atlanta's next one is coming too: Protecting Your House Hack, Tuesday November 10. Same venue, open to everyone.

Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2026-10-14 10:00:00'),

(13, $$Protecting Your House Hack — next House Hacking Atlanta meetup$$, $$Hi {{first_name}},

Two weeks out — Protecting Your House Hack, Tuesday November 10.

The moment you rent out part of your home, your standard homeowners insurance won't cover you the way you think. Roommates, a converted basement, someone else's belongings, liability — all of it changes, and none of it is obvious from the policy you already have.

Here's how the night goes:
6:30  Doors — grab a drink and something to eat, say hi to a few people
7:00  Program, about 30 minutes including Q&A
7:30  Open networking until around 9

New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register on Eventbrite →</a>

Hope to see you,
Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2026-10-28 10:00:00'),

(14, $$Next Tuesday — Protecting Your House Hack$$, $$Hi {{first_name}},

Protecting Your House Hack is next Tuesday, and I'd love for you to come.

This is a gap most house hackers find out about when they file a claim. Better to find out Tuesday.

Doors 6:30, program 7:00 to 7:30, then we're around until about 9.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register →</a>

Really hope to see you there,
Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2026-11-04 10:00:00'),

(15, $$Tonight: Protecting Your House Hack$$, $$Hi {{first_name}},

Tonight! Protecting Your House Hack.

Doors at 6:30, program at 7:00, and we'll be around until about 9.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

Come hungry — the food's good and most people order a small plate and a couple drinks.

Haven't registered? Doesn't matter — just come. Walk-ins are always welcome and there's always room.

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Directions →</a>

See you tonight,
Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2026-11-10 10:00:00'),

(16, $$Last night: the coverage gap nobody checks$$, $$Hi {{first_name}},

What a great night — thank you so much to everyone who came out!

The short version: the moment you rent out part of your home, your standard homeowners policy may not cover you the way you assume. Liability for someone who isn't a household member, their belongings, whether the carrier treats it as a business use — all of it changes, and none of it is obvious from the policy sitting in your inbox.

<strong>A question worth repeating:</strong> does it matter whether I'm renting to a friend or a stranger?

Less than you'd think. Carriers generally care about the arrangement, not the relationship — whether money is changing hands and whether someone outside your household is living there. The five-minute call to your agent is the same call either way.

More on this here:
<a href="https://www.househackingatl.com/insurance-renting-a-room">What renting out a room does to your insurance →</a>

Next month: Screening Tenants, Tuesday December 8. Same place, same time.

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register →</a>

See you next month,
Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2026-11-11 10:00:00'),

-- ---------- EVENT 4: Screening Tenants - Tue Dec 8, 2026 (save-the-date slot -> Women's REI) ----------
(17, $$This month's Women's REI meetup$$, $$Hi {{first_name}},

Our Women's Real Estate Investing meetup is coming up November 24 — 6:30-9pm, New Realm Brewery.

Some of the best deal talk I know of happens in this room first, before it happens anywhere else. New topic every month, same core group of women showing up for each other.

<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Register →</a>

And House Hacking Atlanta's next one: Screening Tenants, Tuesday December 8. Same venue, open to everyone.

Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2026-11-11 10:00:00'),

(18, $$Screening Tenants — next House Hacking Atlanta meetup$$, $$Hi {{first_name}},

Two weeks out — Screening Tenants, Tuesday December 8.

This is the part people underestimate most, and it decides whether house hacking feels effortless or exhausting. A good housemate makes the whole thing work. The wrong one makes you want to sell.

Here's how the night goes:
6:30  Doors — grab a drink and something to eat, say hi to a few people
7:00  Program, about 30 minutes including Q&A
7:30  Open networking until around 9

New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register on Eventbrite →</a>

Hope to see you,
Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2026-11-24 10:00:00'),

(19, $$Next Tuesday — Screening Tenants$$, $$Hi {{first_name}},

Screening Tenants is next Tuesday, and I'd love for you to come.

This is the single thing that decides whether house hacking feels easy or exhausting, and most people learn it the expensive way.

Doors 6:30, program 7:00 to 7:30, then we're around until about 9.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register →</a>

Really hope to see you there,
Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2026-12-02 10:00:00'),

(20, $$Tonight: Screening Tenants$$, $$Hi {{first_name}},

Tonight! Screening Tenants.

Doors at 6:30, program at 7:00, and we'll be around until about 9.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

Come hungry — the food's good and most people order a small plate and a couple drinks.

Haven't registered? Doesn't matter — just come. Walk-ins are always welcome and there's always room.

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Directions →</a>

See you tonight,
Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2026-12-08 10:00:00'),

(21, $$Last night: the most expensive instinct in this business$$, $$Hi {{first_name}},

What a good night — thanks to everyone who came out, especially in December!

The part I want to underline: the instinct to be casual about screening — they seem nice, running an application feels cold — is the most expensive instinct in this business. Same process, every applicant, every time.

<strong>A question worth repeating:</strong> what do you do when someone great applies and their income is just barely short of your standard?

Hold the standard. Not because they're a bad person — because the moment you make an exception, you've made it for everyone. Decide the rule when it's abstract, not when there's a face attached.

More on this here:
<a href="https://www.househackingatl.com/finding-good-housemates">How to find good housemates →</a>

Speaking of the room — Women's Real Estate Investing is coming up December 22, same place. Bring your actual questions — nothing's off limits at this one.

<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Register →</a>

House Hacking's back next month too: House Hacking Panel, Tuesday January 12.

Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2026-12-09 10:00:00'),

-- ---------- EVENT 5: House Hacking Panel - Tue Jan 12, 2027 (save-the-date slot -> Women's REI) ----------
(22, $$This month's Women's REI meetup$$, $$Hi {{first_name}},

Women's Real Estate Investing is coming up December 22 — 6:30-9pm, New Realm Brewery.

If House Hacking Atlanta is where you learn the mechanics, this is where a lot of women actually build the confidence to act on it. Different topic every month, always relevant to whoever's in the room that night.

<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Register →</a>

And House Hacking Atlanta's next one: House Hacking Panel, Tuesday January 12. Same venue, open to everyone.

Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2026-12-16 10:00:00'),

(23, $$House Hacking Panel — next House Hacking Atlanta meetup$$, $$Hi {{first_name}},

Two weeks out — House Hacking Panel, Tuesday January 12.

No slides, no outside speaker — just several local house hackers walking through their actual deals — what they paid, what they rent for, what they pay to live there now, and the parts that didn't go to plan.

Here's how the night goes:
6:30  Doors — grab a drink and something to eat, say hi to a few people
7:00  Program, about 30 minutes including Q&A
7:30  Open networking until around 9

New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register on Eventbrite →</a>

Hope to see you,
Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2027-01-05 10:00:00'),

(24, $$Thursday — House Hacking Panel$$, $$Hi {{first_name}},

House Hacking Panel is this Thursday, and I'd love for you to come.

This is the night the numbers stop being theoretical. Real people, real deals, real answers to the specific questions.

Doors 6:30, program 7:00 to 7:30, then we're around until about 9.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register →</a>

Really hope to see you there,
Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2027-01-07 10:00:00'),

(25, $$Tonight: House Hacking Panel$$, $$Hi {{first_name}},

Tonight! House Hacking Panel.

Doors at 6:30, program at 7:00, and we'll be around until about 9.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

Come hungry — the food's good and most people order a small plate and a couple drinks.

Haven't registered? Doesn't matter — just come. Walk-ins are always welcome and there's always room.

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Directions →</a>

See you tonight,
Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2027-01-12 10:00:00'),

(26, $$Last night: real numbers, real deals$$, $$Hi {{first_name}},

What a night! Thank you to our panelists for being genuinely open about their house hacking stories — what they paid, what they rent for, what lessons they learned and the parts that didn't go according to plan.

<strong>A question worth repeating:</strong> did anyone's family think they were crazy?

Almost universally, yes. Renting out part of your home is still an unusual thing to explain at Thanksgiving. It gets easier when the numbers show up.

More on this here:
<a href="https://www.househackingatl.com/house-stacking">House stacking: what happens after the first one →</a>

Speaking of the room — our Women's Real Estate Investing meetup is coming up January 26, same place. Bring your actual questions — nothing's off limits at this one.

<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Register →</a>

House Hacking's back next month too: Inspecting Your Future, Tuesday February 9.

Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2027-01-13 10:00:00'),

-- ---------- EVENT 6: Inspecting Your Future - Tue Feb 9, 2027 (save-the-date slot -> Women's REI) ----------
(27, $$This month's Women's REI meetup$$, $$Hi {{first_name}},

Women's Real Estate Investing is coming up January 26 — 6:30-9pm, New Realm Brewery.

Smaller room, deeper conversation — this one leans more discussion than lecture, and the topic changes every month based on what the group actually needs.

<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Register →</a>

And House Hacking Atlanta's next one: Inspecting Your Future, Tuesday February 9. Same venue, open to everyone.

Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2027-01-13 10:00:00'),

(28, $$Inspecting Your Future — next House Hacking Atlanta meetup$$, $$Hi {{first_name}},

Two weeks out — Inspecting Your Future, Tuesday February 9.

A finished basement is one of the most common house hack plays in this metro and one of the easiest places to lose money. Egress, ceiling height, moisture, and whether that "already finished" lower level was done by someone who knew what they were doing.

Here's how the night goes:
6:30  Doors — grab a drink and something to eat, say hi to a few people
7:00  Program, about 30 minutes including Q&A
7:30  Open networking until around 9

New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register on Eventbrite →</a>

Hope to see you,
Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2027-01-27 10:00:00'),

(29, $$Next Tuesday — Inspecting Your Future$$, $$Hi {{first_name}},

Inspecting Your Future is next Tuesday, and I'd love for you to come.

If you're shopping right now, this is the session that saves you money on the property you're about to look at.

Doors 6:30, program 7:00 to 7:30, then we're around until about 9.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register →</a>

Really hope to see you there,
Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2027-02-03 10:00:00'),

(30, $$Tonight: Inspecting Your Future$$, $$Hi {{first_name}},

Tonight! Inspecting Your Future.

Doors at 6:30, program at 7:00, and we'll be around until about 9.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

Come hungry — the food's good and most people order a small plate and a couple drinks.

Haven't registered? Doesn't matter — just come. Walk-ins are always welcome and there's always room.

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Directions →</a>

See you tonight,
Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2027-02-09 10:00:00'),

(31, $$Last night: what's actually behind that basement wall$$, $$Hi {{first_name}},

What a good night — thanks to everyone who came out.

The useful frame: a finished basement is one of the most common house hack plays in this metro and one of the easiest places to lose money. Egress, ceiling height, moisture history, and whether the work was permitted.

<strong>A question worth repeating:</strong> what do you find in almost every basement?

Moisture evidence people had stopped noticing. None of it is automatically disqualifying. All of it is worth pricing before you write the offer rather than after.

More on this here:
<a href="https://www.househackingatl.com/house-hack-walkthrough">What we look for on a house hack walkthrough →</a>

Speaking of the room — Women's Real Estate Investing is coming up February 23, same place. Some of the best deal talk I know of happens in that room first.

<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Register →</a>

House Hacking's back next month too: Numbers Workshop — bring a listing, Tuesday March 9.

Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2027-02-10 10:00:00'),

-- ---------- EVENT 7: Numbers Workshop - Tue Mar 9, 2027 (save-the-date slot -> Women's REI) ----------
(32, $$This month's Women's REI meetup$$, $$Hi {{first_name}},

Women's Real Estate Investing meets again February 23 — 6:30-9pm, New Realm Brewery.

Same core group of women showing up for each other, new topic every time. Come with whatever's actually on your mind that month.

<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Register →</a>

And House Hacking Atlanta's next one: Numbers Workshop — bring a listing, Tuesday March 9. Same venue, open to everyone.

Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2027-02-10 10:00:00'),

(33, $$Numbers Workshop — bring a listing — next House Hacking Atlanta meetup$$, $$Hi {{first_name}},

Two weeks out — Numbers Workshop — bring a listing, Tuesday March 9.

This one's a workshop, not a talk. We run the four numbers on real Atlanta listings together, out loud, then we take yours. Bring a property you're curious about and let's work through it together!

Here's how the night goes:
6:30  Doors — grab a drink and something to eat, say hi to a few people
7:00  Program, about 30 minutes including Q&A
7:30  Open networking until around 9

New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register on Eventbrite →</a>

Hope to see you,
Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2027-02-24 10:00:00'),

(34, $$Next Tuesday — Numbers Workshop$$, $$Hi {{first_name}},

Numbers Workshop is next Tuesday, and I'd love for you to come.

Bring a listing you're curious about and we'll run it together in front of the room. That's the whole night.

Doors 6:30, program 7:00 to 7:30, then we're around until about 9.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register →</a>

Really hope to see you there,
Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2027-03-03 10:00:00'),

(35, $$Tonight: Numbers Workshop$$, $$Hi {{first_name}},

Tonight! Numbers Workshop — bring a listing.

Doors at 6:30, program at 7:00, and we'll be around until about 9.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

Come hungry — the food's good and most people order a small plate and a couple drinks.

Haven't registered? Doesn't matter — just come. Walk-ins are always welcome and there's always room.

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Directions →</a>

See you tonight,
Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2027-03-09 10:00:00'),

(36, $$Last night: running the numbers together$$, $$Hi {{first_name}},

That was a fun one! Thanks to everyone who brought a listing and let the room pick it apart — and to the people who found out their deal didn't work, which is genuinely the most valuable outcome of the night.

<strong>A question worth repeating:</strong> what's a deal you talked yourself into that you shouldn't have?

The honest pattern is almost always the same — someone used the best-case rent, assumed full occupancy, and left out a maintenance reserve.

More on this here:
<a href="https://www.househackingatl.com/four-numbers-house-hack">The four numbers, twenty minutes →</a>

Next month: Adding Value to Your House Hack, Tuesday April 13. Same place, same time.

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register →</a>

See you next month,
Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2027-03-10 10:00:00'),

-- ---------- EVENT 8: Adding Value to Your House Hack - Tue Apr 13, 2027 (save-the-date slot -> Women's REI) ----------
(37, $$This month's Women's REI meetup$$, $$Hi {{first_name}},

Women's Real Estate Investing is coming up March 23 — 6:30-9pm, New Realm Brewery.

If you've been meaning to check it out, this is a good month to start. Bring your actual questions — nothing's off limits at this one.

<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Register →</a>

And House Hacking Atlanta's next one: Adding Value to Your House Hack, Tuesday April 13. Same venue, open to everyone.

Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2027-03-17 10:00:00'),

(38, $$Adding Value to Your House Hack — next House Hacking Atlanta meetup$$, $$Hi {{first_name}},

Two weeks out — Adding Value to Your House Hack, Tuesday April 13.

There's a widely held assumption that finishing a basement raises your property value by roughly what you spent. Sometimes that's true. Often it isn't, and the reasons come down to how appraisals actually work.

Here's how the night goes:
6:30  Doors — grab a drink and something to eat, say hi to a few people
7:00  Program, about 30 minutes including Q&A
7:30  Open networking until around 9

New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register on Eventbrite →</a>

Hope to see you,
Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2027-03-31 10:00:00'),

(39, $$Next Tuesday — Adding Value to Your House Hack$$, $$Hi {{first_name}},

Adding Value to Your House Hack is next Tuesday, and I'd love for you to come.

If you're planning a basement or an ADU, come find out what it's actually worth before you spend anything.

Doors 6:30, program 7:00 to 7:30, then we're around until about 9.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register →</a>

Really hope to see you there,
Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2027-04-07 10:00:00'),

(40, $$Tonight: Adding Value to Your House Hack$$, $$Hi {{first_name}},

Tonight! Adding Value to Your House Hack.

Doors at 6:30, program at 7:00, and we'll be around until about 9.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

Come hungry — the food's good and most people order a small plate and a couple drinks.

Haven't registered? Doesn't matter — just come. Walk-ins are always welcome and there's always room.

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Directions →</a>

See you tonight,
Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2027-04-13 10:00:00'),

(41, $$Last night: does the basement actually add value?$$, $$Hi {{first_name}},

What a great night — thank you so much to everyone who came out!

The info a lot of people needed: finishing a basement or adding an ADU does not automatically raise your property value by what you spent. Sometimes it does. Often it doesn't, and the reasons come down to how appraisals actually work.

<strong>A question worth repeating:</strong> does the appraiser care whether the work was permitted?

Frequently, yes — and this is where people get surprised. Unpermitted finished space may not be counted the way you'd expect.

More on this here:
<a href="https://www.househackingatl.com/what-is-appreciation">Does a basement conversion actually raise your value? →</a>

Speaking of the room — our Women's Real Estate Investing meetup is coming up April 27, same place. Same core group of women showing up for each other, new topic every time.

<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Register →</a>

More House Hacking dates are coming too — I'll have the next one for you soon.

Caitlyn Verdugo

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">House Hacking Meetup — 2nd Tuesdays →</a>
<a href="https://www.eventbrite.com/cc/women-real-estate-investors-atl-monthly-meetups-4833857?utm-campaign=social&utm-content=creatorshare&utm-medium=discovery&utm-term=odclsxcollection&utm-source=cp&aff=escb">Women's REI Meetup — 4th Tuesdays →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

Every door is an opportunity. 🚪$$, '2027-04-14 10:00:00')

) as v(step_order, subject, body, local_time);

-- Sanity check - expect 40 rows total, and roughly 15 of them (the
-- announcement trio + 7 reassigned save-the-dates + 5 reassigned recaps)
-- should show true.
select s.step_order, s.subject,
  (s.body like '%This month%Women%' or s.body like '%Women''s Real Estate Investing meetup is%' or s.body like '%second monthly meetup%' or s.body like '%two meetups%' or s.body like '%first-ever House Hacking%') as womens_rei_led
from public.email_sequence_steps s
join public.email_sequences seq on seq.id = s.sequence_id
where seq.name = 'Meetup Reminders'
order by s.step_order;
