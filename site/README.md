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
npm run dev
```

No environment variables needed — this app is fully static (no API routes
of its own, no database, no secrets).

## Contact forms

All three forms (`/contact`'s general form, and `/work-with-me`'s "I'm
Looking to Buy" / "I'm Thinking About Selling" forms) POST directly,
client-side, to the CRM's shared lead endpoint:

```
POST https://crm.callcaitlyn.com/api/webhooks/site-form
```

This is a cross-origin request (this site is `callcaitlyn.com`, the CRM is
`crm.callcaitlyn.com` — a separate Vercel project) rather than a
same-project API call. The CRM finds-or-creates the contact, tags them,
logs the activity, and pushes a notification — see the CRM repo's
`app/api/webhooks/site-form/route.ts` (branch
`claude/custom-crm-real-estate-81k3fp`) for the receiving side.

`lib/crm.ts` holds the endpoint URL and this site's `site: "callcaitlyn"`
key. **That key needs to be registered in the CRM's `SITE_CONFIGS` with
this site's origin (`https://callcaitlyn.com`, `https://www.callcaitlyn.com`)
allowed for CORS before submissions will actually succeed** — coordinate
with whoever is driving the CRM session/branch if forms start failing with
a CORS error in the browser console.

## Content notes

- `lib/content.ts` holds the stats, testimonials, differentiators, and
  service-area data — all pulled from Caitlyn's real, already-public
  colivingcait.com (Zillow reviews, "7 Years Experience," service counties),
  not fabricated.
- `lib/initiatives.ts` holds the House Hacking ATL / CoLivingCait / Atlanta
  Women Investors links shown in the footer.
- The About page's bio and headshot are placeholders — swap in your own
  photo and story before this goes live.
