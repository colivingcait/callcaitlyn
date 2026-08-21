# Caitlyn Verdugo — public site

A standalone Next.js app (separate from the CRM in this repo — see the repo
root's own README), live at `callcaitlyn.com` / `www.callcaitlyn.com`. The
CRM moved to its own project at `crm.callcaitlyn.com`.

Design and voice are modeled directly on
[colivingcait.com](https://www.colivingcait.com) — warm cream/black/gold
palette, serif headlines with an italic gold accent phrase, the card and
testimonial styles, real stats and Zillow reviews reused from that site.

Pages: **Home**, **About**, **Coliving**, **House Hacking**, **Work With
Me** (buy/sell services, lead forms, service areas), **Contact**.

## Run it locally

```
cd site
npm install
cp .env.example .env.local   # fill in Resend keys, see below
npm run dev
```

## Contact forms

Three forms all POST to `/api/contact`, which sends an email via
[Resend](https://resend.com) rather than writing to a database — this site
has no database of its own, unlike the CRM:

- The general form on `/contact`
- The "I'm Looking to Buy" / "I'm Thinking About Selling" forms on
  `/work-with-me`

Setup:

1. Create a Resend account and API key.
2. Verify a sending domain (e.g. `callcaitlyn.com`) under **Domains** — until
   you do, you can only send from `onboarding@resend.dev` to the email
   address on your own Resend account, which is fine for local testing but
   not for real visitor submissions.
3. Set `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, and `CONTACT_FROM_EMAIL` in
   Vercel (and `.env.local` for local dev). Without these, submissions fail
   with a clear error rather than silently disappearing.

## Content notes

- `lib/content.ts` holds the stats, testimonials, differentiators, and
  service-area data — all pulled from Caitlyn's real, already-public
  colivingcait.com (Zillow reviews, "7 Years Experience," service counties),
  not fabricated.
- `lib/initiatives.ts` holds the House Hacking ATL / CoLivingCait / Atlanta
  Women Investors links shown in the footer.
- The About page's bio and headshot are placeholders — swap in your own
  photo and story before this goes live.
