-- One-time data seed, not a schema migration - run this ONCE in Supabase's
-- SQL Editor after supabase/migrations/0018_sequence_upgrades.sql. Creates
-- the two House Hacking ATL email sequences (Meetup Reminders + House
-- Hacking Content), both targeting the existing "Meetup" tag that
-- Eventbrite and Jotform check-in already apply automatically.
--
-- Safe to re-run only in the sense that re-running it will create a SECOND
-- copy of both sequences (there's no upsert/dedupe here on purpose - this
-- is meant to run exactly once). If you need to redo it, delete the two
-- sequences from the Sequences page first (that cascades their steps).

-- ============================================================
-- Sequence A: Meetup Reminders (broadcast, 5 sends x 8 events)
-- ============================================================
with owner as (select id from auth.users limit 1),
     tag as (select t.id from public.tags t, owner o where t.owner_id = o.id and t.name = 'Meetup'),
     seq as (
       insert into public.email_sequences (owner_id, name, type, target_tag_id, description, active)
       select owner.id, 'Meetup Reminders', 'broadcast', tag.id,
         'Save-the-date, full announcement, last call, day-of, and recap for every House Hacking ATL meetup. Runs off the shared "Meetup" tag (auto-applied by Eventbrite registration and Jotform in-person check-in). Confirmed through the April 2027 event - add more steps here as future dates are confirmed.',
         true
       from owner, tag
       returning id
     )
insert into public.email_sequence_steps (sequence_id, step_order, subject, body, send_at, active)
select seq.id, v.step_order, v.subject, v.body, (v.local_time::timestamp at time zone 'America/New_York'), true
from seq, (values

-- ---------- EVENT 1: Financing a House Hack - Tue Sep 8, 2026 ----------
(0, $$September meetup: Financing a House Hack$$, $$Hi {{first_name}},

Getting next month's meetup on your radar early!

Financing a House Hack — Tuesday, September 8, 6:30pm.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

When you buy a property you're going to live in, you qualify for better financing, easier qualification and lower down payment.

These nights are truly some of my favorites. You'll find people at every stage in the room — folks running their first set of numbers, investors a few properties in, and the lenders, contractors, and property managers worth knowing. Everybody's generous with what they've figured out along their own journey.

Free to attend, every experience level welcome! Bring a friend or come alone. Grab a spot:

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Save your spot →</a>

More details closer to the date. Would love to see you there!

Caitlyn Verdugo

Every door is an opportunity. 🚪$$, '2026-08-12 10:00:00'),

(1, $$Financing a House Hack — next House Hacking Atlanta meetup$$, $$Hi {{first_name}},

Two weeks out — Financing a House Hack, Tuesday September 8.

When you buy a property you're going to live in, you qualify for better financing, easier qualification and lower down payment. That gap is the entire engine behind house hacking, and most first-time buyers have no idea it exists!

Here's how the night goes:
6:30  Doors — grab a drink and something to eat, say hi to a few people
7:00  Program, about 30 minutes including Q&A
7:30  Open networking until around 9

The second half is always my favorite part. That's when people trade ideas, compare basement conversions, and occasionally talk somebody out of a bad deal. You'll meet investors at every stage — people three months ahead of you, people ten properties in, and people just starting out — plus the lenders, inspectors, insurance and everyone you'll want on your team.

First-timers and experienced investors welcome! Come alone or bring a friend!

New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register on Eventbrite →</a>

Can't make this one? We're here every second Tuesday — and the Facebook group keeps things going in between.

<a href="https://facebook.com/groups/househackingatl">Join the group →</a>

Hope to see you,
Caitlyn Verdugo

Every door is an opportunity. 🚪$$, '2026-08-26 10:00:00'),

(2, $$Next Tuesday — Financing a House Hack$$, $$Hi {{first_name}},

Financing a House Hack is next Tuesday, and I'd love for you to come.

If you've ever thought you needed 20% down to buy something that produces income, this is the night that changes that.

If you've been meaning to make it to one of these and haven't yet, this is a good one to start with. Nobody will put you on the spot or make you introduce yourself. A lot of people show up on their own the first time, but they don't leave that way!

The back half of the night is entirely for meeting people, and it's the part folks keep coming back for.

Doors 6:30, program 7:00 to 7:30, then we're around until about 9.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register →</a>

Really hope to see you there,
Caitlyn$$, '2026-09-02 10:00:00'),

(3, $$Tonight: Financing a House Hack$$, $$Hi {{first_name}},

Tonight! Financing a House Hack.

Doors at 6:30, program at 7:00, and we'll be around until about 9.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

Come hungry — the food's good and most people order a small plate and a couple drinks.

And stick around after the program. That's when everybody actually talks to each other, and it's the best part of the night!

Haven't registered? Doesn't matter — just come. Walk-ins are always welcome and there's always room.

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Directions →</a>

See you tonight,
Caitlyn$$, '2026-09-08 10:00:00'),

(4, $$Last night: the 5% down conversation$$, $$Hi {{first_name}},

What a good night. Thanks to everyone who came out — and to the folks who stuck around talking well past nine!

The thing I hope stuck: when you buy a property you're going to live in, you get terms an investor on that same house simply cannot get. A smaller down payment, a better rate, easier qualification. That gap is the entire engine behind house hacking, and most people have no idea it's available to them.

<strong>A question worth repeating:</strong> what happens if you move out before the occupancy period is up?

Worth knowing the real answer rather than guessing. Occupancy requirements are actual obligations, not technicalities — but the period is usually shorter than people assume, and once it's satisfied you can move out, rent the whole property, and use owner-occupant financing again on your next place. That sequence is how most people end up with a second property. Ask your lender for the specific period on your specific loan, in writing.

More on this here:
<a href="https://www.househackingatl.com/owner-occupant-financing-house-hacking">Why owner-occupant loans are the whole reason this works →</a>

Next month: Finding the Deal, Tuesday October 13. Same place, same time. Bring someone with you.

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register →</a>

Not in the Facebook group yet? Come join us — that's where this conversation keeps going between meetups.

<a href="https://facebook.com/groups/househackingatl">Join the group →</a>

And if you're actively looking right now, or you've got a specific property you're trying to figure out, grab twenty minutes on my calendar and let's talk it through. No charge, no obligation — I do this all day anyway.

<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Find a time →</a>

See you next month,
Caitlyn

Every door is an opportunity. 🚪$$, '2026-09-09 10:00:00'),

-- ---------- EVENT 2: Finding the Deal - Tue Oct 13, 2026 ----------
(5, $$October meetup: Finding the Deal$$, $$Hi {{first_name}},

Getting next month's meetup on your radar early!

Finding the Deal — Tuesday, October 13, 6:30pm.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

The houses that photograph best are often the hardest to house hack.

These nights are truly some of my favorites. You'll find people at every stage in the room — folks running their first set of numbers, investors a few properties in, and the lenders, contractors, and property managers worth knowing. Everybody's generous with what they've figured out along their own journey.

Free to attend, every experience level welcome! Bring a friend or come alone. Grab a spot:

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Save your spot →</a>

More details closer to the date. Would love to see you there!

Caitlyn Verdugo

Every door is an opportunity. 🚪$$, '2026-09-16 10:00:00'),

(6, $$Finding the Deal — next House Hacking Atlanta meetup$$, $$Hi {{first_name}},

Two weeks out — Finding the Deal, Tuesday October 13.

The houses that photograph best are often the hardest to house hack. We're getting specific about what actually works in the Atlanta metro — basements worth converting, layouts with real separation, and the details that quietly kill a deal after you've closed.

Here's how the night goes:
6:30  Doors — grab a drink and something to eat, say hi to a few people
7:00  Program, about 30 minutes including Q&A
7:30  Open networking until around 9

The second half is always my favorite part. That's when people trade ideas, compare basement conversions, and occasionally talk somebody out of a bad deal. You'll meet investors at every stage — people three months ahead of you, people ten properties in, and people just starting out — plus the lenders, inspectors, insurance and everyone you'll want on your team.

First-timers and experienced investors welcome! Come alone or bring a friend!

New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register on Eventbrite →</a>

Can't make this one? We're here every second Tuesday — and the Facebook group keeps things going in between.

<a href="https://facebook.com/groups/househackingatl">Join the group →</a>

Hope to see you,
Caitlyn Verdugo

Every door is an opportunity. 🚪$$, '2026-09-30 10:00:00'),

(7, $$Next Tuesday — Finding the Deal$$, $$Hi {{first_name}},

Finding the Deal is next Tuesday, and I'd love for you to come.

If you're actively looking, bring a listing. We'll talk through whether it actually works for your goals.

If you've been meaning to make it to one of these and haven't yet, this is a good one to start with. Nobody will put you on the spot or make you introduce yourself. A lot of people show up on their own the first time, but they don't leave that way!

The back half of the night is entirely for meeting people, and it's the part folks keep coming back for.

Doors 6:30, program 7:00 to 7:30, then we're around until about 9.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register →</a>

Really hope to see you there,
Caitlyn$$, '2026-10-07 10:00:00'),

(8, $$Tonight: Finding the Deal$$, $$Hi {{first_name}},

Tonight! Finding the Deal.

Doors at 6:30, program at 7:00, and we'll be around until about 9.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

Come hungry — the food's good and most people order a small plate and a couple drinks.

And stick around after the program. That's when everybody actually talks to each other, and it's the best part of the night!

Haven't registered? Doesn't matter — just come. Walk-ins are always welcome and there's always room.

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Directions →</a>

See you tonight,
Caitlyn$$, '2026-10-13 10:00:00'),

(9, $$Last night: the houses that don't work$$, $$Hi {{first_name}},

What a great night — thank you so much to everyone who came out!

The through-line: separation beats square footage. The houses that photograph beautifully — open concept, wide sightlines, everything flowing together — are often the hardest to house hack. What actually works is the stuff that shows badly. Tri-levels, split levels, awkward multi-zone layouts where the geometry already puts distance between people.

<strong>A question worth repeating:</strong> is there a layout you'd walk away from no matter how good the price is?

Yes — a house where the only way to reach the rentable space is through your living room. You can still rent it, but it earns spare-bedroom rent, not separate-unit rent, and no discount fixes that. Price it as what it is rather than what you hoped it would be.

More on this here:
<a href="https://www.househackingatl.com/what-makes-a-good-house-hack">What makes a good house hack →</a>

Next month: Protecting Your House Hack, Tuesday November 10. Same place, same time. Bring someone with you.

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register →</a>

Not in the Facebook group yet? Come join us — that's where this conversation keeps going between meetups.

<a href="https://facebook.com/groups/househackingatl">Join the group →</a>

And if you're actively looking right now, or you've got a specific property you're trying to figure out, grab twenty minutes on my calendar and let's talk it through. No charge, no obligation — I do this all day anyway.

<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Find a time →</a>

See you next month,
Caitlyn

Every door is an opportunity. 🚪$$, '2026-10-14 10:00:00'),

-- ---------- EVENT 3: Protecting Your House Hack - Tue Nov 10, 2026 ----------
(10, $$November meetup: Protecting Your House Hack$$, $$Hi {{first_name}},

Getting next month's meetup on your radar early!

Protecting Your House Hack — Tuesday, November 10, 6:30pm.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

The moment you rent out part of your home, your standard homeowners insurance won't cover you the way you think.

These nights are truly some of my favorites. You'll find people at every stage in the room — folks running their first set of numbers, investors a few properties in, and the lenders, contractors, and property managers worth knowing. Everybody's generous with what they've figured out along their own journey.

Free to attend, every experience level welcome! Bring a friend or come alone. Grab a spot:

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Save your spot →</a>

More details closer to the date. Would love to see you there!

Caitlyn Verdugo

Every door is an opportunity. 🚪$$, '2026-10-14 10:00:00'),

(11, $$Protecting Your House Hack — next House Hacking Atlanta meetup$$, $$Hi {{first_name}},

Two weeks out — Protecting Your House Hack, Tuesday November 10.

The moment you rent out part of your home, your standard homeowners insurance won't cover you the way you think. Roommates, a converted basement, someone else's belongings, liability — all of it changes, and none of it is obvious from the policy you already have.

Here's how the night goes:
6:30  Doors — grab a drink and something to eat, say hi to a few people
7:00  Program, about 30 minutes including Q&A
7:30  Open networking until around 9

The second half is always my favorite part. That's when people trade ideas, compare basement conversions, and occasionally talk somebody out of a bad deal. You'll meet investors at every stage — people three months ahead of you, people ten properties in, and people just starting out — plus the lenders, inspectors, insurance and everyone you'll want on your team.

First-timers and experienced investors welcome! Come alone or bring a friend!

New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register on Eventbrite →</a>

Can't make this one? We're here every second Tuesday — and the Facebook group keeps things going in between.

<a href="https://facebook.com/groups/househackingatl">Join the group →</a>

Hope to see you,
Caitlyn Verdugo

Every door is an opportunity. 🚪$$, '2026-10-28 10:00:00'),

(12, $$Next Tuesday — Protecting Your House Hack$$, $$Hi {{first_name}},

Protecting Your House Hack is next Tuesday, and I'd love for you to come.

This is a gap most house hackers find out about when they file a claim. Better to find out Tuesday.

If you've been meaning to make it to one of these and haven't yet, this is a good one to start with. Nobody will put you on the spot or make you introduce yourself. A lot of people show up on their own the first time, but they don't leave that way!

The back half of the night is entirely for meeting people, and it's the part folks keep coming back for.

Doors 6:30, program 7:00 to 7:30, then we're around until about 9.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register →</a>

Really hope to see you there,
Caitlyn$$, '2026-11-04 10:00:00'),

(13, $$Tonight: Protecting Your House Hack$$, $$Hi {{first_name}},

Tonight! Protecting Your House Hack.

Doors at 6:30, program at 7:00, and we'll be around until about 9.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

Come hungry — the food's good and most people order a small plate and a couple drinks.

And stick around after the program. That's when everybody actually talks to each other, and it's the best part of the night!

Haven't registered? Doesn't matter — just come. Walk-ins are always welcome and there's always room.

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Directions →</a>

See you tonight,
Caitlyn$$, '2026-11-10 10:00:00'),

(14, $$Last night: the coverage gap nobody checks$$, $$Hi {{first_name}},

What a great night — thank you so much to everyone who came out!

The short version: the moment you rent out part of your home, your standard homeowners policy may not cover you the way you assume. Liability for someone who isn't a household member, their belongings, whether the carrier treats it as a business use — all of it changes, and none of it is obvious from the policy sitting in your inbox.

<strong>A question worth repeating:</strong> does it matter whether I'm renting to a friend or a stranger?

Less than you'd think. Carriers generally care about the arrangement, not the relationship — whether money is changing hands and whether someone outside your household is living there. Renting a room to a friend at below market rent can still change your coverage picture. The five-minute call to your agent is the same call either way.

More on this here:
<a href="https://www.househackingatl.com/insurance-renting-a-room">What renting out a room does to your insurance →</a>

Next month: Screening Tenants, Tuesday December 8. Same place, same time. Bring someone with you.

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register →</a>

Not in the Facebook group yet? Come join us — that's where this conversation keeps going between meetups.

<a href="https://facebook.com/groups/househackingatl">Join the group →</a>

And if you're actively looking right now, or you've got a specific property you're trying to figure out, grab twenty minutes on my calendar and let's talk it through. No charge, no obligation — I do this all day anyway.

<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Find a time →</a>

See you next month,
Caitlyn

Every door is an opportunity. 🚪$$, '2026-11-11 10:00:00'),

-- ---------- EVENT 4: Screening Tenants - Tue Dec 8, 2026 ----------
(15, $$December meetup: Screening Tenants$$, $$Hi {{first_name}},

Getting next month's meetup on your radar early!

Screening Tenants — Tuesday, December 8, 6:30pm.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

This is the part people underestimate most, and it decides whether house hacking feels effortless or exhausting.

These nights are truly some of my favorites. You'll find people at every stage in the room — folks running their first set of numbers, investors a few properties in, and the lenders, contractors, and property managers worth knowing. Everybody's generous with what they've figured out along their own journey.

Free to attend, every experience level welcome! Bring a friend or come alone. Grab a spot:

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Save your spot →</a>

More details closer to the date. Would love to see you there!

Caitlyn Verdugo

Every door is an opportunity. 🚪$$, '2026-11-11 10:00:00'),

(16, $$Screening Tenants — next House Hacking Atlanta meetup$$, $$Hi {{first_name}},

Two weeks out — Screening Tenants, Tuesday December 8.

This is the part people underestimate most, and it decides whether house hacking feels effortless or exhausting. A good housemate makes the whole thing work. The wrong one makes you want to sell.

Here's how the night goes:
6:30  Doors — grab a drink and something to eat, say hi to a few people
7:00  Program, about 30 minutes including Q&A
7:30  Open networking until around 9

The second half is always my favorite part. That's when people trade ideas, compare basement conversions, and occasionally talk somebody out of a bad deal. You'll meet investors at every stage — people three months ahead of you, people ten properties in, and people just starting out — plus the lenders, inspectors, insurance and everyone you'll want on your team.

First-timers and experienced investors welcome! Come alone or bring a friend!

New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register on Eventbrite →</a>

Can't make this one? We're here every second Tuesday — and the Facebook group keeps things going in between.

<a href="https://facebook.com/groups/househackingatl">Join the group →</a>

Hope to see you,
Caitlyn Verdugo

Every door is an opportunity. 🚪$$, '2026-11-24 10:00:00'),

(17, $$Next Tuesday — Screening Tenants$$, $$Hi {{first_name}},

Screening Tenants is next Tuesday, and I'd love for you to come.

This is the single thing that decides whether house hacking feels easy or exhausting, and most people learn it the expensive way.

If you've been meaning to make it to one of these and haven't yet, this is a good one to start with. Nobody will put you on the spot or make you introduce yourself. A lot of people show up on their own the first time, but they don't leave that way!

The back half of the night is entirely for meeting people, and it's the part folks keep coming back for.

Doors 6:30, program 7:00 to 7:30, then we're around until about 9.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register →</a>

Really hope to see you there,
Caitlyn$$, '2026-12-02 10:00:00'),

(18, $$Tonight: Screening Tenants$$, $$Hi {{first_name}},

Tonight! Screening Tenants.

Doors at 6:30, program at 7:00, and we'll be around until about 9.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

Come hungry — the food's good and most people order a small plate and a couple drinks.

And stick around after the program. That's when everybody actually talks to each other, and it's the best part of the night!

Haven't registered? Doesn't matter — just come. Walk-ins are always welcome and there's always room.

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Directions →</a>

See you tonight,
Caitlyn$$, '2026-12-08 10:00:00'),

(19, $$Last night: the most expensive instinct in this business$$, $$Hi {{first_name}},

What a good night — thanks to everyone who came out, especially in December!

The part I want to underline from our conversations: the instinct to be casual about screening — they seem nice, they're a friend of a friend, running an application feels cold — is the most expensive instinct in this business. Same process, every applicant, every time. It's not distrust. It's what lets you be genuinely warm later, because the rules aren't a judgment call about a specific person.

<strong>A question worth repeating:</strong> what do you do when someone great applies and their income is just barely short of your standard?

Hold the standard. Not because they're a bad person — because the moment you make an exception, you've made it for everyone, and you'll have a much harder conversation the next time someone asks. If you want flexibility, build it into the standard itself before you meet anyone: a co-signer option, a larger deposit, whatever you'd actually accept. Decide the rule when it's abstract, not when there's a face attached.

More on this here:
<a href="https://www.househackingatl.com/finding-good-housemates">How to find good housemates →</a>

Next month: House Hacking Panel, Tuesday January 12. Same place, same time. Bring someone with you.

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register →</a>

Not in the Facebook group yet? Come join us — that's where this conversation keeps going between meetups.

<a href="https://facebook.com/groups/househackingatl">Join the group →</a>

And if you're actively looking right now, or you've got a specific property you're trying to figure out, grab twenty minutes on my calendar and let's talk it through. No charge, no obligation — I do this all day anyway.

<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Find a time →</a>

See you next month,
Caitlyn

Every door is an opportunity. 🚪$$, '2026-12-09 10:00:00'),

-- ---------- EVENT 5: House Hacking Panel - Tue Jan 12, 2027 ----------
(20, $$January meetup: House Hacking Panel$$, $$Hi {{first_name}},

Getting next month's meetup on your radar early!

House Hacking Panel — Tuesday, January 12, 6:30pm.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

No slides, no outside speaker — just several local house hackers walking through their actual deals — what they paid, what they rent for, what they pay to live there now, and the parts that didn't go to plan.

These nights are truly some of my favorites. You'll find people at every stage in the room — folks running their first set of numbers, investors a few properties in, and the lenders, contractors, and property managers worth knowing. Everybody's generous with what they've figured out along their own journey.

Free to attend, every experience level welcome! Bring a friend or come alone. Grab a spot:

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Save your spot →</a>

More details closer to the date. Would love to see you there!

Caitlyn Verdugo

Every door is an opportunity. 🚪$$, '2026-12-16 10:00:00'),

(21, $$House Hacking Panel — next House Hacking Atlanta meetup$$, $$Hi {{first_name}},

Two weeks out — House Hacking Panel, Tuesday January 12.

No slides, no outside speaker — just several local house hackers walking through their actual deals — what they paid, what they rent for, what they pay to live there now, and the parts that didn't go to plan.

Here's how the night goes:
6:30  Doors — grab a drink and something to eat, say hi to a few people
7:00  Program, about 30 minutes including Q&A
7:30  Open networking until around 9

The second half is always my favorite part. That's when people trade ideas, compare basement conversions, and occasionally talk somebody out of a bad deal. You'll meet investors at every stage — people three months ahead of you, people ten properties in, and people just starting out — plus the lenders, inspectors, insurance and everyone you'll want on your team.

First-timers and experienced investors welcome! Come alone or bring a friend!

New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register on Eventbrite →</a>

Can't make this one? We're here every second Tuesday — and the Facebook group keeps things going in between.

<a href="https://facebook.com/groups/househackingatl">Join the group →</a>

Hope to see you,
Caitlyn Verdugo

Every door is an opportunity. 🚪$$, '2027-01-05 10:00:00'),

(22, $$Thursday — House Hacking Panel$$, $$Hi {{first_name}},

House Hacking Panel is this Thursday, and I'd love for you to come.

This is the night the numbers stop being theoretical. Real people, real deals, real answers to the specific questions.

If you've been meaning to make it to one of these and haven't yet, this is a good one to start with. Nobody will put you on the spot or make you introduce yourself. A lot of people show up on their own the first time, but they don't leave that way!

The back half of the night is entirely for meeting people, and it's the part folks keep coming back for.

Doors 6:30, program 7:00 to 7:30, then we're around until about 9.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register →</a>

Really hope to see you there,
Caitlyn$$, '2027-01-07 10:00:00'),

(23, $$Tonight: House Hacking Panel$$, $$Hi {{first_name}},

Tonight! House Hacking Panel.

Doors at 6:30, program at 7:00, and we'll be around until about 9.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

Come hungry — the food's good and most people order a small plate and a couple drinks.

And stick around after the program. That's when everybody actually talks to each other, and it's the best part of the night!

Haven't registered? Doesn't matter — just come. Walk-ins are always welcome and there's always room.

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Directions →</a>

See you tonight,
Caitlyn$$, '2027-01-12 10:00:00'),

(24, $$Last night: real numbers, real deals$$, $$Hi {{first_name}},

What a night! Thank you to our panelists for being genuinely open about their house hacking stories — what they paid, what they rent for, what lessons they learned and the parts that didn't go according to plan. That kind of honesty is rare and it's most of why this room works!

If there was one theme: nobody's first property was the best one. They were all smaller, messier, and more uncertain than the version people imagine — and most people agree the second one was a completely different experience.

<strong>A question worth repeating:</strong> did anyone's family think they were crazy?

Almost universally, yes. Renting out part of your home is still an unusual thing to explain at Thanksgiving, and most people doing it fielded some skepticism early on. It gets easier when the numbers show up — but if you're currently the only person in your family who thinks this is a good idea, you're in extremely normal company.

More on this here:
<a href="https://www.househackingatl.com/house-stacking">House stacking: what happens after the first one →</a>

Next month: Inspecting Your Future, Tuesday February 9. Same place, same time. Bring someone with you.

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register →</a>

Not in the Facebook group yet? Come join us — that's where this conversation keeps going between meetups.

<a href="https://facebook.com/groups/househackingatl">Join the group →</a>

And if you're actively looking right now, or you've got a specific property you're trying to figure out, grab twenty minutes on my calendar and let's talk it through. No charge, no obligation — I do this all day anyway.

<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Find a time →</a>

See you next month,
Caitlyn

Every door is an opportunity. 🚪$$, '2027-01-13 10:00:00'),

-- ---------- EVENT 6: Inspecting Your Future - Tue Feb 9, 2027 ----------
(25, $$February meetup: Inspecting Your Future$$, $$Hi {{first_name}},

Getting next month's meetup on your radar early!

Inspecting Your Future — Tuesday, February 9, 6:30pm.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

A finished basement is one of the most common house hack plays in this metro and one of the easiest places to lose money.

These nights are truly some of my favorites. You'll find people at every stage in the room — folks running their first set of numbers, investors a few properties in, and the lenders, contractors, and property managers worth knowing. Everybody's generous with what they've figured out along their own journey.

Free to attend, every experience level welcome! Bring a friend or come alone. Grab a spot:

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Save your spot →</a>

More details closer to the date. Would love to see you there!

Caitlyn Verdugo

Every door is an opportunity. 🚪$$, '2027-01-13 10:00:00'),

(26, $$Inspecting Your Future — next House Hacking Atlanta meetup$$, $$Hi {{first_name}},

Two weeks out — Inspecting Your Future, Tuesday February 9.

A finished basement is one of the most common house hack plays in this metro and one of the easiest places to lose money. Egress, ceiling height, moisture, and whether that "already finished" lower level was done by someone who knew what they were doing.

Here's how the night goes:
6:30  Doors — grab a drink and something to eat, say hi to a few people
7:00  Program, about 30 minutes including Q&A
7:30  Open networking until around 9

The second half is always my favorite part. That's when people trade ideas, compare basement conversions, and occasionally talk somebody out of a bad deal. You'll meet investors at every stage — people three months ahead of you, people ten properties in, and people just starting out — plus the lenders, inspectors, insurance and everyone you'll want on your team.

First-timers and experienced investors welcome! Come alone or bring a friend!

New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register on Eventbrite →</a>

Can't make this one? We're here every second Tuesday — and the Facebook group keeps things going in between.

<a href="https://facebook.com/groups/househackingatl">Join the group →</a>

Hope to see you,
Caitlyn Verdugo

Every door is an opportunity. 🚪$$, '2027-01-27 10:00:00'),

(27, $$Next Tuesday — Inspecting Your Future$$, $$Hi {{first_name}},

Inspecting Your Future is next Tuesday, and I'd love for you to come.

If you're shopping right now, this is the session that saves you money on the property you're about to look at.

If you've been meaning to make it to one of these and haven't yet, this is a good one to start with. Nobody will put you on the spot or make you introduce yourself. A lot of people show up on their own the first time, but they don't leave that way!

The back half of the night is entirely for meeting people, and it's the part folks keep coming back for.

Doors 6:30, program 7:00 to 7:30, then we're around until about 9.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register →</a>

Really hope to see you there,
Caitlyn$$, '2027-02-03 10:00:00'),

(28, $$Tonight: Inspecting Your Future$$, $$Hi {{first_name}},

Tonight! Inspecting Your Future.

Doors at 6:30, program at 7:00, and we'll be around until about 9.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

Come hungry — the food's good and most people order a small plate and a couple drinks.

And stick around after the program. That's when everybody actually talks to each other, and it's the best part of the night!

Haven't registered? Doesn't matter — just come. Walk-ins are always welcome and there's always room.

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Directions →</a>

See you tonight,
Caitlyn$$, '2027-02-09 10:00:00'),

(29, $$Last night: what's actually behind that basement wall$$, $$Hi {{first_name}},

What a good night — thanks to everyone who came out.

The useful frame: a finished basement is one of the most common house hack plays in this metro and one of the easiest places to lose money. Egress, ceiling height, moisture history, whether the work was permitted, and whether that "already finished" lower level was finished by someone who knew what they were doing.

<strong>A question worth repeating:</strong> what do you find in almost every basement?

Moisture evidence people had stopped noticing. Staining where the wall meets the floor, a faint smell, or everything in storage sitting on pallets — which tells you the owner knows something they didn't disclose. None of it is automatically disqualifying. All of it is worth pricing before you write the offer rather than after.

More on this here:
<a href="https://www.househackingatl.com/house-hack-walkthrough">What we look for on a house hack walkthrough →</a>

Next month: Numbers Workshop — bring a listing, Tuesday March 9. Same place, same time. Bring someone with you.

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register →</a>

Not in the Facebook group yet? Come join us — that's where this conversation keeps going between meetups.

<a href="https://facebook.com/groups/househackingatl">Join the group →</a>

And if you're actively looking right now, or you've got a specific property you're trying to figure out, grab twenty minutes on my calendar and let's talk it through. No charge, no obligation — I do this all day anyway.

<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Find a time →</a>

See you next month,
Caitlyn

Every door is an opportunity. 🚪$$, '2027-02-10 10:00:00'),

-- ---------- EVENT 7: Numbers Workshop - Tue Mar 9, 2027 ----------
(30, $$March meetup: Numbers Workshop — bring a listing$$, $$Hi {{first_name}},

Getting next month's meetup on your radar early!

Numbers Workshop — bring a listing — Tuesday, March 9, 6:30pm.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

This one's a workshop, not a talk.

These nights are truly some of my favorites. You'll find people at every stage in the room — folks running their first set of numbers, investors a few properties in, and the lenders, contractors, and property managers worth knowing. Everybody's generous with what they've figured out along their own journey.

Free to attend, every experience level welcome! Bring a friend or come alone. Grab a spot:

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Save your spot →</a>

More details closer to the date. Would love to see you there!

Caitlyn Verdugo

Every door is an opportunity. 🚪$$, '2027-02-10 10:00:00'),

(31, $$Numbers Workshop — bring a listing — next House Hacking Atlanta meetup$$, $$Hi {{first_name}},

Two weeks out — Numbers Workshop — bring a listing, Tuesday March 9.

This one's a workshop, not a talk. March is when people start looking seriously for a summer move — so we run the four numbers on real Atlanta listings together, out loud, then we take yours. Bring a property you're curious about and let's work through it together!

Here's how the night goes:
6:30  Doors — grab a drink and something to eat, say hi to a few people
7:00  Program, about 30 minutes including Q&A
7:30  Open networking until around 9

The second half is always my favorite part. That's when people trade ideas, compare basement conversions, and occasionally talk somebody out of a bad deal. You'll meet investors at every stage — people three months ahead of you, people ten properties in, and people just starting out — plus the lenders, inspectors, insurance and everyone you'll want on your team.

First-timers and experienced investors welcome! Come alone or bring a friend!

New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register on Eventbrite →</a>

Can't make this one? We're here every second Tuesday — and the Facebook group keeps things going in between.

<a href="https://facebook.com/groups/househackingatl">Join the group →</a>

Hope to see you,
Caitlyn Verdugo

Every door is an opportunity. 🚪$$, '2027-02-24 10:00:00'),

(32, $$Next Tuesday — Numbers Workshop$$, $$Hi {{first_name}},

Numbers Workshop is next Tuesday, and I'd love for you to come.

Bring a listing you're curious about and we'll run it together in front of the room. That's the whole night.

If you've been meaning to make it to one of these and haven't yet, this is a good one to start with. Nobody will put you on the spot or make you introduce yourself. A lot of people show up on their own the first time, but they don't leave that way!

The back half of the night is entirely for meeting people, and it's the part folks keep coming back for.

Doors 6:30, program 7:00 to 7:30, then we're around until about 9.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register →</a>

Really hope to see you there,
Caitlyn$$, '2027-03-03 10:00:00'),

(33, $$Tonight: Numbers Workshop$$, $$Hi {{first_name}},

Tonight! Numbers Workshop — bring a listing.

Doors at 6:30, program at 7:00, and we'll be around until about 9.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

Come hungry — the food's good and most people order a small plate and a couple drinks.

And stick around after the program. That's when everybody actually talks to each other, and it's the best part of the night!

Haven't registered? Doesn't matter — just come. Walk-ins are always welcome and there's always room.

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Directions →</a>

See you tonight,
Caitlyn$$, '2027-03-09 10:00:00'),

(34, $$Last night: running the numbers together$$, $$Hi {{first_name}},

That was a fun one! Thanks to everyone who brought a listing and let the room pick it apart — and to the people who found out their deal didn't work, which is genuinely the most valuable outcome of the night.

The framework, if you want it on paper: what it actually costs to own, realistic rental income minus vacancy, your effective housing cost compared to what you'd otherwise pay in rent, and what happens when you eventually move out. Run them in that order. Each one can end the analysis.

<strong>A question worth repeating:</strong> what's a deal you talked yourself into that you shouldn't have?

The honest pattern is almost always the same — someone used the best-case rent, assumed full occupancy, and left out a maintenance reserve. The deal looked great because it was built to. If you're finding yourself adjusting inputs until the answer works, that's the answer.

More on this here:
<a href="https://www.househackingatl.com/four-numbers-house-hack">The four numbers, twenty minutes →</a>

Next month: Adding Value to Your House Hack, Tuesday April 13. Same place, same time. Bring someone with you.

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register →</a>

Not in the Facebook group yet? Come join us — that's where this conversation keeps going between meetups.

<a href="https://facebook.com/groups/househackingatl">Join the group →</a>

And if you're actively looking right now, or you've got a specific property you're trying to figure out, grab twenty minutes on my calendar and let's talk it through. No charge, no obligation — I do this all day anyway.

<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Find a time →</a>

See you next month,
Caitlyn

Every door is an opportunity. 🚪$$, '2027-03-10 10:00:00'),

-- ---------- EVENT 8: Adding Value to Your House Hack - Tue Apr 13, 2027 ----------
(35, $$April meetup: Adding Value to Your House Hack$$, $$Hi {{first_name}},

Getting next month's meetup on your radar early!

Adding Value to Your House Hack — Tuesday, April 13, 6:30pm.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

There's a widely held assumption that finishing a basement raises your property value by roughly what you spent.

These nights are truly some of my favorites. You'll find people at every stage in the room — folks running their first set of numbers, investors a few properties in, and the lenders, contractors, and property managers worth knowing. Everybody's generous with what they've figured out along their own journey.

Free to attend, every experience level welcome! Bring a friend or come alone. Grab a spot:

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Save your spot →</a>

More details closer to the date. Would love to see you there!

Caitlyn Verdugo

Every door is an opportunity. 🚪$$, '2027-03-17 10:00:00'),

(36, $$Adding Value to Your House Hack — next House Hacking Atlanta meetup$$, $$Hi {{first_name}},

Two weeks out — Adding Value to Your House Hack, Tuesday April 13.

There's a widely held assumption that finishing a basement raises your property value by roughly what you spent. Sometimes that's true. Often it isn't, and the reasons come down to how appraisals actually work.

Here's how the night goes:
6:30  Doors — grab a drink and something to eat, say hi to a few people
7:00  Program, about 30 minutes including Q&A
7:30  Open networking until around 9

The second half is always my favorite part. That's when people trade ideas, compare basement conversions, and occasionally talk somebody out of a bad deal. You'll meet investors at every stage — people three months ahead of you, people ten properties in, and people just starting out — plus the lenders, inspectors, insurance and everyone you'll want on your team.

First-timers and experienced investors welcome! Come alone or bring a friend!

New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register on Eventbrite →</a>

Can't make this one? We're here every second Tuesday — and the Facebook group keeps things going in between.

<a href="https://facebook.com/groups/househackingatl">Join the group →</a>

Hope to see you,
Caitlyn Verdugo

Every door is an opportunity. 🚪$$, '2027-03-31 10:00:00'),

(37, $$Next Tuesday — Adding Value to Your House Hack$$, $$Hi {{first_name}},

Adding Value to Your House Hack is next Tuesday, and I'd love for you to come.

If you're planning a basement or an ADU, come find out what it's actually worth before you spend anything.

If you've been meaning to make it to one of these and haven't yet, this is a good one to start with. Nobody will put you on the spot or make you introduce yourself. A lot of people show up on their own the first time, but they don't leave that way!

The back half of the night is entirely for meeting people, and it's the part folks keep coming back for.

Doors 6:30, program 7:00 to 7:30, then we're around until about 9.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Register →</a>

Really hope to see you there,
Caitlyn$$, '2027-04-07 10:00:00'),

(38, $$Tonight: Adding Value to Your House Hack$$, $$Hi {{first_name}},

Tonight! Adding Value to Your House Hack.

Doors at 6:30, program at 7:00, and we'll be around until about 9.
New Realm Brewery, 550 Somerset Terrace NE #101, Atlanta, GA 30306

Come hungry — the food's good and most people order a small plate and a couple drinks.

And stick around after the program. That's when everybody actually talks to each other, and it's the best part of the night!

Haven't registered? Doesn't matter — just come. Walk-ins are always welcome and there's always room.

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Directions →</a>

See you tonight,
Caitlyn$$, '2027-04-13 10:00:00'),

(39, $$Last night: does the basement actually add value?$$, $$Hi {{first_name}},

What a great night — thank you so much to everyone who came out!

The info a lot of people needed: finishing a basement or adding an ADU does not automatically raise your property value by what you spent. Sometimes it does. Often it doesn't, and the reasons come down to how appraisals actually work and what comparable properties in that specific submarket support.

<strong>A question worth repeating:</strong> does the appraiser care whether the work was permitted?

Frequently, yes — and this is where people get surprised. Unpermitted finished space may not be counted the way you'd expect, which means you can spend real money on a conversion and see less of it back at appraisal than you planned. Worth understanding before the work starts, not when you're refinancing.

More on this here:
<a href="https://www.househackingatl.com/what-is-appreciation">Does a basement conversion actually raise your value? →</a>

Not in the Facebook group yet? Come join us — that's where this conversation keeps going between meetups.

<a href="https://facebook.com/groups/househackingatl">Join the group →</a>

And if you're actively looking right now, or you've got a specific property you're trying to figure out, grab twenty minutes on my calendar and let's talk it through. No charge, no obligation — I do this all day anyway.

<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Find a time →</a>

More meetups are coming — I'll have the next date for you soon.

Caitlyn

Every door is an opportunity. 🚪$$, '2027-04-14 10:00:00')

) as v(step_order, subject, body, local_time);

-- ============================================================
-- Sequence B: House Hacking Content (drip, 26 steps, every 14 days,
-- day 0 = signup, then +14 each step, ends after B26 - no repeat)
-- ============================================================
with owner as (select id from auth.users limit 1),
     tag as (select t.id from public.tags t, owner o where t.owner_id = o.id and t.name = 'Meetup'),
     seq as (
       insert into public.email_sequences (owner_id, name, type, target_tag_id, description, active)
       select owner.id, 'House Hacking Content', 'drip', tag.id,
         '26 emails, every 14 days from signup (whatever weekday/time they joined), one year of house-hacking education start to finish, then ends - no repeat. Runs off the same "Meetup" tag as Meetup Reminders, so everyone gets both.',
         true
       from owner, tag
       returning id
     )
insert into public.email_sequence_steps (sequence_id, step_order, subject, body, delay_amount, delay_unit, active)
select seq.id, v.step_order, v.subject, v.body, v.delay_amount, 'days', true
from seq, (values

(0, $$Welcome! Start here 🚪$$, $$Hi {{first_name}},

So glad you're here!

Quick version of what house hacking is: you live in one part of your property and rent out another. A spare bedroom. A converted basement. A backyard ADU. One side of a duplex. Your housing costs go down while you build equity — same house, same time.

That's it. That's the whole idea. Everything else is detail.

My own first one was a basement. Not a duplex, not some portfolio play — one basement, turned into a studio apartment. It changed my housing cost enough to change what was possible, and honestly I had no idea at the time that it was the beginning of anything!

I put together a one-page overview of the whole strategy — the four models, the financing, the numbers, and what to actually look for in a property. It's the thing I wish someone had handed me all those years ago:

<a href="https://www.househackingatl.com/downloads/house-hacking-one-page.pdf">Grab the one-pager →</a>

Every couple of weeks I'll send you something short — the financing, the numbers, what it's really like living with the people renting from you. No fluff, and you can unsubscribe anytime.

And if you'd rather just dig in, there's a whole library here:

<a href="https://www.househackingatl.com">househackingatl.com →</a>

Really happy you're here and can't wait to see you in our Facebook group and in person meetups!

Caitlyn Verdugo
Serial house hacker, real estate investor, and your favorite Atlanta realtor
<a href="https://facebook.com/groups/househackingatl">Join us on Facebook →</a>
<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Meet us in person →</a>
<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Got questions? Let's chat →</a>

Every door is an opportunity. 🚪$$, 0),

(1, $$The reason this works at all$$, $$Hi {{first_name}},

I want to tell you the single most useful thing I know about real estate, and it takes about thirty seconds.

When you buy a property you're going to *live in*, lenders give you completely different terms than when you buy one you won't. Smaller down payment. Better rate. Easier qualification. Same house, same street, same day — different loan, because of where you sleep.

That's the whole engine. Not a loophole, not a trick — the system working exactly as designed.

And here's the part almost nobody knows: the loan doesn't stop being an owner-occupant loan when you move out. Live there for the period your loan requires, then rent the whole thing and do it again on your next place. That sequence is how most people end up with a second and third property.

I wrote the full breakdown here, including the questions to actually ask a lender:

<a href="https://www.househackingatl.com/owner-occupant-financing-house-hacking">Why owner-occupant loans are the whole reason this works →</a>

If you take one thing from these emails, let it be this one.

Caitlyn Verdugo
Serial house hacker, real estate investor, and your favorite Atlanta realtor
<a href="https://facebook.com/groups/househackingatl">Join us on Facebook →</a>
<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Meet us in person →</a>
<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Got questions? Let's chat →</a>

Every door is an opportunity. 🚪$$, 14),

(2, $$Four numbers, twenty minutes$$, $$Hi {{first_name}},

The most expensive mistake I see isn't buying a bad house. It's buying a perfectly fine house on numbers nobody actually ran.

It happens because the math *feels* obvious. Mortgage is X, rent is Y, Y is close to X, this works! Then you close and meet the water heater.

There are four numbers, and together they take about twenty minutes:

1. What it actually costs to own — not the mortgage. Taxes, insurance, utilities you cover, and a maintenance reserve.
2. Realistic rental income — what comparable spaces actually rent for, minus vacancy. Not best case.
3. Your effective housing cost — #1 minus #2, compared to what you'd pay in rent anyway.
4. What happens when you move out — does it cover itself then?

I made a fill-in worksheet so you don't have to remember any of it:

<a href="https://www.househackingatl.com/downloads/four-numbers-worksheet.pdf">Get the four numbers worksheet →</a>

Print it, run it on a listing you have zero intention of buying, and do that once a week. After about ten you'll see the answer before you finish. That's the actual skill.

Caitlyn Verdugo
Serial house hacker, real estate investor, and your favorite Atlanta realtor
<a href="https://facebook.com/groups/househackingatl">Join us on Facebook →</a>
<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Meet us in person →</a>
<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Got questions? Let's chat →</a>

Every door is an opportunity. 🚪$$, 14),

(3, $$The prettiest houses are the worst house hacks$$, $$Hi {{first_name}},

Slightly annoying truth: the houses that photograph beautifully are often the hardest ones to house hack.

Open concept. Wide sightlines. Everything flowing together. It sells instantly to families — and it's the exact opposite of what you want when two households share a building. Open concept exists so a parent can see the whole floor at once!

What actually works tends to show badly. Tri-levels. Split levels. Awkward multi-zone layouts where the geometry already puts distance between people. In this metro they're everywhere, and they're usually cheaper than the open-concept house everyone else is bidding on.

The whole walkthrough comes down to one question I ask myself in every house: <strong>can two people live here without constantly being in each other's way?</strong>

Here's what I actually look for — separation, entrances, the bathroom ratio, parking, and the listings that look great and don't work:

<a href="https://www.househackingatl.com/what-makes-a-good-house-hack">What makes a good house hack →</a>

And if you're touring anything soon, take this with you. Half of it is photos nobody thinks to take:

<a href="https://www.househackingatl.com/downloads/property-walkthrough-checklist.pdf">The walkthrough checklist →</a>

Caitlyn Verdugo
Serial house hacker, real estate investor, and your favorite Atlanta realtor
<a href="https://facebook.com/groups/househackingatl">Join us on Facebook →</a>
<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Meet us in person →</a>
<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Got questions? Let's chat →</a>

Every door is an opportunity. 🚪$$, 14),

(4, $$Okay but what's it actually like?$$, $$Hi {{first_name}},

Every single conversation I have about house hacking hits the same moment. Someone's excited about the numbers, they get the financing, they can see it — and then their face changes and they ask the real question.

<strong>But what's it actually like?</strong>

Honest answer: way more boring than you're imagining. You come home, somebody's door is closed, you make dinner, you go to bed. Whole days go by where you barely see each other. That's not a sign something's wrong — that's two adults with different schedules sharing a building.

The real friction isn't dramatic. It's dishes. It's someone taking a call at 6:30am. It's the thermostat, which I promise causes more tension in shared houses than money does.

None of it ends relationships. All of it gets worse if you let it sit.

The full honest version is here:

<a href="https://www.househackingatl.com/what-its-like-to-live-with-your-tenants">What it's actually like to live with your tenants →</a>

And if you want to ask real people who are doing this right now — that's exactly what our Facebook group is for. Come say hi!

<a href="https://facebook.com/groups/househackingatl">Join the group →</a>

Caitlyn Verdugo
Serial house hacker, real estate investor, and your favorite Atlanta realtor
<a href="https://facebook.com/groups/househackingatl">Join us on Facebook →</a>
<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Meet us in person →</a>
<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Got questions? Let's chat →</a>

Every door is an opportunity. 🚪$$, 14),

(5, $$You might already own the house$$, $$Hi {{first_name}},

Something I don't say loudly enough: if you already own a home with space you don't use, you are *so much* closer to this than anyone still shopping.

No down payment. No search. No closing costs. You already did the hard part. There's just square footage in your house that isn't earning anything.

And you have an advantage buyers don't — you already know that house. You know which room gets cold, where sound carries, which entrance nobody uses. That takes new owners a year to figure out, and it's exactly what determines whether a space rents well.

The move is to start smaller than you're picturing. Most people jump straight to "I'd have to finish the basement" in their head, decide it's too much, and do nothing. Start with what already exists — a spare bedroom, a finished lower level, a lock and some furniture. Find out whether you even like this before you spend a dollar converting anything.

Three levels of effort, and what to look at in your own house:

<a href="https://www.househackingatl.com/house-hack-home-you-already-own">House hacking a home you already own →</a>

Caitlyn Verdugo
Serial house hacker, real estate investor, and your favorite Atlanta realtor
<a href="https://facebook.com/groups/househackingatl">Join us on Facebook →</a>
<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Meet us in person →</a>
<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Got questions? Let's chat →</a>

Every door is an opportunity. 🚪$$, 14),

(6, $$Come meet everybody$$, $$Hi {{first_name}},

We're about three months in together, so I want to invite you to the thing that actually moves people from "someday" to "okay, I'm doing this."

We do a meetup on the second Tuesday of every month. Different topic, guest speaker, then open networking until around nine. Free, and every experience level shows up — people running their first set of numbers, people ten properties in, plus the lenders and contractors and inspectors you'll eventually want on your team.

Honestly? The back half is the best part. That's when people trade contractor names, compare basement conversions, and occasionally talk somebody out of a bad deal.

A lot of folks come alone the first time. They don't leave that way.

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">See what's coming up →</a>

My own path started at somebody else's meetup, back when I had exactly one converted basement and no plan. I met people further along than me who were absurdly generous with what they knew, and that changed everything about what happened next.

Come find your people.

Caitlyn Verdugo
Serial house hacker, real estate investor, and your favorite Atlanta realtor
<a href="https://facebook.com/groups/househackingatl">Join us on Facebook →</a>
<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Meet us in person →</a>
<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Got questions? Let's chat →</a>

Every door is an opportunity. 🚪$$, 14),

(7, $$Basement, bonus room, or bedroom?$$, $$Hi {{first_name}},

If you're looking around your house wondering which space to rent out, you're probably choosing between three. They are not equal!

<strong>The spare bedroom</strong> earns the least and costs nothing to start. A lock, some furniture, a good listing, and you could have income this month. That speed is worth more than people think.

<strong>The bonus room over the garage</strong> looks like the obvious answer because it's big and unused — and it's the one that most often disappoints. Usually no bathroom, access through the house, and it's famously the coldest and hottest room you own.

<strong>The basement</strong> earns the most by a wide margin, but only if one condition is met: a separate exterior entrance. That single feature is the difference between "a room in your house" and "somewhere someone lives." Different renter, longer stay, meaningfully higher rent.

Atlanta does us a favor here, by the way. All these sloped lots mean walk-out lower levels are everywhere — a lot of our housing stock has the key feature almost by accident.

Full comparison, including what each costs to get ready:

<a href="https://www.househackingatl.com/which-space-rents">Which space actually rents →</a>

Caitlyn Verdugo
Serial house hacker, real estate investor, and your favorite Atlanta realtor
<a href="https://facebook.com/groups/househackingatl">Join us on Facebook →</a>
<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Meet us in person →</a>
<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Got questions? Let's chat →</a>

Every door is an opportunity. 🚪$$, 14),

(8, $$Do this before you look at a single house$$, $$Hi {{first_name}},

Almost everybody does this backwards.

They browse listings for two months, fall in love with something, and *then* find out what they qualify for. By which point they're attached to a house that was never available to them.

Flip it. One conversation with a lender — before you look at anything — tells you your actual price range, which programs fit your situation, what you'd really need at closing, and whether projected rental income can help you qualify. All of that decides what you should even be searching for.

The question people skip, and the one that matters most for what comes later: <strong>what happens to this loan if I move out and rent the whole thing?</strong>

Ask it now, not in three years.

And talk to more than one lender. They differ in which programs they offer and how they handle multi-unit properties. The first answer you get is one answer, not the answer.

Here are the twelve questions I'd walk in with:

<a href="https://www.househackingatl.com/questions-to-ask-a-lender">What to ask a lender before you look at houses →</a>

Caitlyn Verdugo
Serial house hacker, real estate investor, and your favorite Atlanta realtor
<a href="https://facebook.com/groups/househackingatl">Join us on Facebook →</a>
<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Meet us in person →</a>
<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Got questions? Let's chat →</a>

Every door is an opportunity. 🚪$$, 14),

(9, $$What's your space actually worth?$$, $$Hi {{first_name}},

Every house hack projection rests on one number — what the space will rent for. Get it wrong by fifteen percent and a deal that looked comfortable stops working.

And most people get it by guessing. One listing they saw. A number a friend mentioned. That's not research, that's an assumption wearing a number's clothes!

The fix is straightforward. Define exactly what you're offering first — private or shared entrance, private or shared bath, furnished or not. Then pull five comparable spaces that actually match. Drop the highest and lowest, use the middle, and adjust honestly.

One trap worth naming: if you're checking Airbnb, use the *monthly* rate, never the nightly price times thirty. That gap is enormous and it's the fastest way to badly overestimate what you'll earn.

Where to look, how to compare, and how to adjust without flattering yourself:

<a href="https://www.househackingatl.com/what-your-space-is-worth">How to figure out what your space is worth →</a>

Caitlyn Verdugo
Serial house hacker, real estate investor, and your favorite Atlanta realtor
<a href="https://facebook.com/groups/househackingatl">Join us on Facebook →</a>
<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Meet us in person →</a>
<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Got questions? Let's chat →</a>

Every door is an opportunity. 🚪$$, 14),

(10, $$What I check on every walkthrough$$, $$Hi {{first_name}},

Listing photos are marketing. Shot wide, lit well, framed to hide whatever the seller would rather you not think about. That's not dishonest — it's just what photos are for.

Which means the walkthrough is where you actually evaluate a house. And most people spend it looking at the same things they already saw online.

A few things I do instead:

Stand in every bedroom doorway and look <strong>out</strong>, not in. What does a resident see when they open their door in the morning?

Stand still for thirty seconds and just listen. Then have someone walk upstairs while you stand below.

Open every closet. Storage is invisible until it isn't — belongings that have nowhere to go end up in shared space, and that's where resentment starts.

Count how many cars fit in the driveway without anyone getting blocked in. Out loud.

I turned the whole thing into a printable checklist. Take it with you — half of it is photos nobody thinks to take:

<a href="https://www.househackingatl.com/downloads/property-walkthrough-checklist.pdf">The walkthrough checklist →</a>

Caitlyn Verdugo
Serial house hacker, real estate investor, and your favorite Atlanta realtor
<a href="https://facebook.com/groups/househackingatl">Join us on Facebook →</a>
<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Meet us in person →</a>
<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Got questions? Let's chat →</a>

Every door is an opportunity. 🚪$$, 14),

(11, $$Duplex or single-family?$$, $$Hi {{first_name}},

Both work. They're genuinely different, though, and there's one difference almost nobody tells first-time buyers about.

On a <strong>legitimate two-to-four unit property</strong>, an appraiser can produce a market rent analysis for the units — and depending on your loan program, part of that projected rent may count toward what you qualify for. Which means a duplex can, in effect, help you qualify for itself.

On a <strong>single-family house you plan to rent by the room</strong>, that generally doesn't work the same way. There's no separate unit to appraise. The plan to rent bedrooms is a plan, not a property characteristic.

That can change your entire price range, so it's worth asking a lender about both before you start looking.

The tradeoffs run the other way too: duplexes are scarce and priced accordingly, while a single-family with several bedrooms often produces more total income and spreads your vacancy risk across more people.

Full comparison here:

<a href="https://www.househackingatl.com/duplex-vs-single-family">Duplex vs. single-family for a house hack →</a>

Caitlyn Verdugo
Serial house hacker, real estate investor, and your favorite Atlanta realtor
<a href="https://facebook.com/groups/househackingatl">Join us on Facebook →</a>
<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Meet us in person →</a>
<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Got questions? Let's chat →</a>

Every door is an opportunity. 🚪$$, 14),

(12, $$Should you buy more house on purpose?$$, $$Hi {{first_name}},

Standard homebuying advice says buy what you need and not a square foot more. House hacking inverts that — and the inversion is kind of the whole point.

If the extra space produces income, a bigger house can leave you paying *less* every month than a smaller one. Bigger payment, but rooms that earn. Compare effective housing costs, not purchase prices.

But the logic has real limits, and they're worth saying out loud. Not every extra square foot rents — a fifth bedroom does, a bigger great room doesn't. Your payment is fixed and your income isn't. And a bigger house is more to maintain and more to operate.

So here's the question I'd actually ask: <strong>if every rented space sat empty for three months, would you be okay?</strong>

If yes, the stretch is probably reasonable. If no, you've built a plan with no margin, and the vacancy that tests it will arrive at the least convenient possible moment.

More on where the math works and where it breaks:

<a href="https://www.househackingatl.com/buy-more-house-on-purpose">Should you buy more house than you need? →</a>

This one comes up in the group a lot, if you want to see what other people decided:

<a href="https://facebook.com/groups/househackingatl">Join the group →</a>

Caitlyn Verdugo
Serial house hacker, real estate investor, and your favorite Atlanta realtor
<a href="https://facebook.com/groups/househackingatl">Join us on Facebook →</a>
<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Meet us in person →</a>
<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Got questions? Let's chat →</a>

Every door is an opportunity. 🚪$$, 14),

(13, $$An empty room costs one month$$, $$Hi {{first_name}},

Your house hack lives or dies on who lives in it. Everyone knows that, and almost everyone still skips the process.

Here's how it happens: they seem nice. They're a friend of a friend. They need a place fast, and running a formal application feels cold and a little weird. So you skip it — and most of the time nothing bad happens, which is exactly why the habit sticks until the time it does.

Same process. Every person. Every time. Written application, income verification, background and rental history, a real conversation, and a written lease even for one room.

And the math you need in your pocket for week three, when the room's been empty and someone adequate is available Friday:

<strong>An empty room costs you one month. The wrong person costs you months</strong> — of friction, of your actual daily quality of life, and probably a turnover anyway.

That's not close. It's not even a little close.

If you're not sure about somebody, that's your answer.

<a href="https://www.househackingatl.com/finding-good-housemates">How to find good housemates →</a>

Caitlyn Verdugo
Serial house hacker, real estate investor, and your favorite Atlanta realtor
<a href="https://facebook.com/groups/househackingatl">Join us on Facebook →</a>
<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Meet us in person →</a>
<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Got questions? Let's chat →</a>

Every door is an opportunity. 🚪$$, 14),

(14, $$The ten-minute conversation that saves you months$$, $$Hi {{first_name}},

Almost every conflict in a shared house traces back to something nobody talked about before move-in. Not a fight — an *assumption*.

One person assumed guests were fine. Another assumed the living room was communal. Neither was wrong! They just never checked.

So check. Before anyone signs:

Guests — how often, how long, overnight or not. Noise — when does the house get quiet? The living room — genuinely shared, or primarily yours? (Either is fine. Undefined is what causes problems.) The kitchen — assigned shelves or a free-for-all. Cleaning, parking, and the thermostat, which I promise is worth thirty seconds.

Ten minutes of unglamorous questions prevents most of what would otherwise become a real problem two months in. And anyone who reacts badly to being asked has just given you valuable information for free.

I made a guide with the whole conversation laid out, plus space to write the answers down so they can go straight into the lease:

<a href="https://www.househackingatl.com/downloads/before-anyone-moves-in.pdf">Before anyone moves in →</a>

Caitlyn Verdugo
Serial house hacker, real estate investor, and your favorite Atlanta realtor
<a href="https://facebook.com/groups/househackingatl">Join us on Facebook →</a>
<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Meet us in person →</a>
<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Got questions? Let's chat →</a>

Every door is an opportunity. 🚪$$, 14),

(15, $$Your first thirty days$$, $$Hi {{first_name}},

Every article about house hacking ends at the closing table. Congratulations, you got the keys! And then you're standing in an empty house with a payment due in a month and nobody told you what to do next.

Rough order:

<strong>Call your insurance agent first.</strong> Before you list anything. Renting out part of your home changes your coverage situation, and the wrong time to find that out is after something happens.

<strong>Do only what blocks a rental</strong> — locks, detectors, anything broken. Then the cheap things that raise rent: clean thoroughly, paint if it's rough, make sure the lighting is decent. Then stop! The backsplash can wait. Every week the space sits empty costs you a full month's housing.

<strong>Budget for a vacant month.</strong> This is the one that saves you. If you've planned for it, you're not making a rushed decision in week three when someone adequate wants to move in Friday.

Full thirty-day sequence here:

<a href="https://www.househackingatl.com/first-30-days-house-hack">The first 30 days after you close →</a>

Caitlyn Verdugo
Serial house hacker, real estate investor, and your favorite Atlanta realtor
<a href="https://facebook.com/groups/househackingatl">Join us on Facebook →</a>
<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Meet us in person →</a>
<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Got questions? Let's chat →</a>

Every door is an opportunity. 🚪$$, 14),

(16, $$Best $200 I ever spent on a rental$$, $$Hi {{first_name}},

A second refrigerator. Genuinely.

Fridge space is the number one source of low-grade tension in a shared house. Not rent, not noise — fridge space. And it's almost entirely solvable with equipment instead of rules.

That's actually the pattern for everything in a shared house. Assigned parking. Assigned bathrooms where the ratio allows. A living room that's clearly either communal or primarily yours. Labeled shelves.

You're not being strict. You're removing the thing people would otherwise have to negotiate every single week.

Houses where everyone has to constantly be considerate are exhausting. Houses where the setup already answered the question kind of run themselves — and people stay in them much longer.

More on kitchens, laundry, storage, and the living room problem everyone runs into:

<a href="https://www.househackingatl.com/shared-spaces-that-work">Shared spaces that actually work →</a>

What's the best small thing you've bought for your place? People swap these in the group constantly — come add yours.

<a href="https://facebook.com/groups/househackingatl">Join the group →</a>

Caitlyn Verdugo
Serial house hacker, real estate investor, and your favorite Atlanta realtor
<a href="https://facebook.com/groups/househackingatl">Join us on Facebook →</a>
<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Meet us in person →</a>
<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Got questions? Let's chat →</a>

Every door is an opportunity. 🚪$$, 14),

(17, $$Find a plumber before you need one$$, $$Hi {{first_name}},

Every first-year house hacker underestimates maintenance. The mortgage calculator does not mention the water heater!

And in a house hack it's not just a cost, it's a service level. When people are living in your house paying rent, a broken AC stops being something you'll deal with Saturday and becomes something you handle now.

Two things that fix most of this:

<strong>Reserve a percentage of rent every month and treat it as spent.</strong> The people who struggle with house hacking usually aren't the ones who had expensive repairs — they're the ones who experienced every repair as a crisis because the money wasn't set aside.

<strong>Build your vendor list before anything breaks.</strong> Plumber, electrician, HVAC, handyman, cleaner. Finding a plumber at 9pm on a Sunday means emergency pricing from whoever picks up. Having a number in your phone means a text and a normal rate.

That second one is maybe the highest-return afternoon of work in this whole business.

What tends to break, and how to budget for it:

<a href="https://www.househackingatl.com/what-breaks-house-hack-maintenance">What breaks, and how to budget for it →</a>

Caitlyn Verdugo
Serial house hacker, real estate investor, and your favorite Atlanta realtor
<a href="https://facebook.com/groups/househackingatl">Join us on Facebook →</a>
<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Meet us in person →</a>
<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Got questions? Let's chat →</a>

Every door is an opportunity. 🚪$$, 14),

(18, $$Should rent include utilities?$$, $$Hi {{first_name}},

Three ways to handle this, and most people default into one without deciding.

<strong>Included in rent.</strong> Simplest to advertise, easiest to administer, and you can charge a higher number because people like predictable total cost. Downside: you're absorbing usage risk.

<strong>Split between residents.</strong> Feels fair, and it's a monthly headache — collecting variable amounts, forwarding bills, explaining why this month was higher.

<strong>Included with a cap.</strong> Included up to a set amount, overages split. Most months nobody thinks about it, and you're protected from the extremes.

For most house hacks I'd go with the third one, always include internet, and buy a smart thermostat with a reasonable range set. That last one removes what is genuinely one of the most common sources of friction in any shared house.

For furnished or mid-term rentals, include everything, no exceptions. The whole value proposition is that someone arrives with a suitcase.

Full breakdown, including how to set the cap:

<a href="https://www.househackingatl.com/utilities-included-or-separate">Utilities: included, separate, or capped? →</a>

Caitlyn Verdugo
Serial house hacker, real estate investor, and your favorite Atlanta realtor
<a href="https://facebook.com/groups/househackingatl">Join us on Facebook →</a>
<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Meet us in person →</a>
<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Got questions? Let's chat →</a>

Every door is an opportunity. 🚪$$, 14),

(19, $$Rigorous about systems, warm about people$$, $$Hi {{first_name}},

The hardest part of being a live-in landlord is that you're two things at once — somebody's housemate *and* the person who owns the building and collects the rent.

That feels contradictory, so people pick a side. Either they get so businesslike the house feels cold and nobody renews, or so friendly they can't enforce anything and end up quietly resentful.

You don't have to pick.

<strong>Be rigorous about the systems.</strong> Same application every time. Written lease. Rent on the same date, same platform, automated. Documented condition at move-in.

<strong>Be warm about the people.</strong> Answer texts. Fix the thing that's broken. Remember what they told you about their job.

Here's why that works: the systems are what *let* you be warm. When the rules are clear and written down and applied to everyone equally, you're never making a judgment call about your friend — you're both just following what you agreed to.

That's the whole trick, honestly:

<a href="https://www.househackingatl.com/good-landlord-live-in">How to be a good landlord in your own home →</a>

And come to a meetup sometime — this is exactly the kind of thing people compare notes on afterward.

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">See what's coming up →</a>

Caitlyn Verdugo
Serial house hacker, real estate investor, and your favorite Atlanta realtor
<a href="https://facebook.com/groups/househackingatl">Join us on Facebook →</a>
<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Meet us in person →</a>
<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Got questions? Let's chat →</a>

Every door is an opportunity. 🚪$$, 14),

(20, $$Cash flow is one of four returns$$, $$Hi {{first_name}},

Most people evaluate a property on one number: does it cash flow?

Reasonable instinct, incomplete picture. There are four returns, and for a lot of owners cash flow is the smallest of them.

<strong>Cash flow</strong> — the money left after everything's paid. The only one you can spend, which is why it gets all the attention.

<strong>Appreciation</strong> — the property becoming worth more. And because it works on the whole property value while you only put a fraction down, a modest gain is enormous relative to what you actually invested.

<strong>Debt paydown</strong> — every month, part of the payment reduces what you owe. Your residents are buying you equity. Nobody counts this one.

<strong>Tax treatment</strong> — rental property is treated differently than most income, and some of it is meaningful.

A property with modest cash flow doing all four can substantially outperform one with strong cash flow doing nothing else.

That's not an argument for ignoring cash flow — you need enough to survive a vacancy. It's an argument for counting all four.

<a href="https://www.househackingatl.com/four-ways-real-estate-makes-money">The four ways real estate actually makes money →</a>

Caitlyn Verdugo
Serial house hacker, real estate investor, and your favorite Atlanta realtor
<a href="https://facebook.com/groups/househackingatl">Join us on Facebook →</a>
<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Meet us in person →</a>
<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Got questions? Let's chat →</a>

Every door is an opportunity. 🚪$$, 14),

(21, $$The return nobody talks about$$, $$Hi {{first_name}},

Here's a twenty-minute exercise that changes how people see their own property.

Pull up an amortization schedule for your loan — any calculator will do it. Look at the principal column. Add it up over however long you plan to hold the property.

Now compare that number to your projected cash flow over the same period.

On most house hacks, especially ones bought with a small down payment, <strong>the principal number is bigger.</strong> Often a lot bigger. And nobody put it in the listing.

Debt paydown is the most reliable return in real estate because it doesn't depend on the market, on rents rising, or on anything except the loan running its course. It also accelerates — early on most of your payment is interest, but that flips over time, and year fifteen builds far more equity than year one with no change in your payment.

In a house hack, your residents are doing that on the house you also live in. A renter paying market rent builds zero equity. Permanently. That's the actual comparison.

<a href="https://www.househackingatl.com/debt-paydown-explained">Debt paydown: the return nobody talks about →</a>

Caitlyn Verdugo
Serial house hacker, real estate investor, and your favorite Atlanta realtor
<a href="https://facebook.com/groups/househackingatl">Join us on Facebook →</a>
<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Meet us in person →</a>
<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Got questions? Let's chat →</a>

Every door is an opportunity. 🚪$$, 14),

(22, $$The tax part, in plain English$$, $$Hi {{first_name}},

Fair warning: I'm a realtor, not a CPA, and none of this is advice for your situation. But I want you to know the vocabulary, because it makes the conversation with an actual professional about ten times more useful.

<strong>Depreciation</strong> is the big one. The tax code generally treats a rental building as something that wears out, and lets you deduct a portion of its value each year — even though you didn't spend that money that year, and even if the property is gaining value. There's a reconciliation when you sell, so it's a timing benefit rather than free money, but it's real.

<strong>Operating expenses</strong> on the rental portion are generally deductible. In a house hack, a lot of costs get *allocated* between personal and rental use, which is why records matter more here than in a normal rental.

<strong>Primary residence provisions</strong> may apply to the part you occupy — and they interact with all of the above in interesting ways.

The single best thing you can do: talk to a CPA who works with rental owners <strong>before</strong> you rent anything out. Not at tax time.

<a href="https://www.househackingatl.com/tax-benefits-of-real-estate">The tax benefits of real estate, in plain English →</a>

Caitlyn Verdugo
Serial house hacker, real estate investor, and your favorite Atlanta realtor
<a href="https://facebook.com/groups/househackingatl">Join us on Facebook →</a>
<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Meet us in person →</a>
<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Got questions? Let's chat →</a>

Every door is an opportunity. 🚪$$, 14),

(23, $$Furnished, or not?$$, $$Hi {{first_name}},

This decision gets made by default more often than it gets made on purpose — and they're genuinely different businesses.

<strong>Unfurnished</strong> costs nothing to start, attracts people who are moving in properly, and turns over less. Bigger applicant pool, less to maintain, simpler.

<strong>Furnished</strong> rents for meaningfully more and attracts a completely different resident — people on temporary assignments, relocating, in transition. They're out of the house most of the day, they're not trying to build a social life in your kitchen, and they tell you their end date at move-in.

The cost is real though: you're buying furniture *and* the hundred small things that actually make a place livable. Cookware, towels, a lamp that works. Half-furnished is worse than unfurnished, because you're charging a premium and not delivering the thing the premium was for.

For a first house hack I'd start unfurnished, unless your space has genuine privacy, you're near employers that bring people in on contract, and you have furnishing capital that isn't your reserves.

<a href="https://www.househackingatl.com/furnished-vs-unfurnished-house-hack">Furnished or unfurnished? →</a>

Caitlyn Verdugo
Serial house hacker, real estate investor, and your favorite Atlanta realtor
<a href="https://facebook.com/groups/househackingatl">Join us on Facebook →</a>
<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Meet us in person →</a>
<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Got questions? Let's chat →</a>

Every door is an opportunity. 🚪$$, 14),

(24, $$Your housing cost dropped. Where'd the money go?$$, $$Hi {{first_name}},

Here's the version of this story nobody tells, and it's the most common outcome.

Someone house hacks successfully. Housing cost drops substantially. Three years later they have roughly the same savings they'd have had otherwise.

Nothing went wrong! The property performed, the residents were fine. But the money went into ordinary life — better groceries, more travel, a nicer car, all individually reasonable — and there was never a moment where a decision got made.

Because a monthly gap isn't a windfall. It's an *absence*. And absences get absorbed.

The fix is boring and it works: figure out what you were paying before, keep living on that number, and automate the difference out of your checking account the day rent lands. That converts an absence into a transaction — something that leaves your account and accumulates somewhere you can see.

Three years of that is a down payment. That's the whole mechanism behind everything people call "stacking."

<a href="https://www.househackingatl.com/what-to-do-with-house-hack-savings">What to do with the money you're saving →</a>

People talk about this in the group more than you'd expect — it's the part nobody plans for.

<a href="https://facebook.com/groups/househackingatl">Join the group →</a>

Caitlyn Verdugo
Serial house hacker, real estate investor, and your favorite Atlanta realtor
<a href="https://facebook.com/groups/househackingatl">Join us on Facebook →</a>
<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Meet us in person →</a>
<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Got questions? Let's chat →</a>

Every door is an opportunity. 🚪$$, 14),

(25, $$The first house is hard. The second one isn't.$$, $$Hi {{first_name}},

Last one in this series — and thank you for reading all year.

The thing I most want you to take with you: the first property is genuinely difficult. You're saving a down payment while paying full market rent, you don't know what you're doing, and every decision feels enormous because you have no reference point. It takes most people years.

The second one is a completely different experience. You have equity. You have savings that accumulated almost passively. You have a track record a lender can look at. And you've done it once, so you know which parts were actually scary and which just felt scary.

Most people quit during the hardest part — right before it gets easier.

<a href="https://www.househackingatl.com/house-stacking">House stacking: what happens after the first one →</a>

Everything I've sent you, plus about eighty more articles, lives here whenever you need it:

<a href="https://www.househackingatl.com">househackingatl.com →</a>

And the best next step is still coming to a meetup. Second Tuesday of every month, free. Come learn something and meet the people you'll end up doing this alongside.

<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">See what's coming up →</a>
<a href="https://facebook.com/groups/househackingatl">Join the Facebook group →</a>

You'll still hear from me about meetups — but this is the end of the series. It's been really nice having you along.

Caitlyn Verdugo
Serial house hacker, real estate investor, and your favorite Atlanta realtor
<a href="https://facebook.com/groups/househackingatl">Join us on Facebook →</a>
<a href="https://www.eventbrite.com/cc/house-hacking-atl-4861227">Meet us in person →</a>
<a href="https://calendly.com/colivingcait/buyer-or-seller-discovery-call">Got questions? Let's chat →</a>

Every door is an opportunity. 🚪$$, 14)

) as v(step_order, subject, body, delay_amount);
