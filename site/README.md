# Caitlyn Verdugo — public site

A standalone Next.js app (separate from the CRM in this repo — see the repo
root's own README), live at `callcaitlyn.com` / `www.callcaitlyn.com`. The
CRM moved to its own project at `crm.callcaitlyn.com`.

Design system is ColivingCait's own, ported verbatim from its
`DESIGNSYSTEM.md`: Cormorant Garamond headings + DM Sans body, one gold
accent (`#C4955A`) on warm neutrals, square corners everywhere (the
Tailwind border-radius scale is overridden to 0 globally), no icon
library (single Unicode glyphs — ◈ $ ⌂ ♀ ★ ✦ ⊕ — in the heading font,
gold), and scroll-reveal/hero-entrance motion matching the original's
easing curves. See `tailwind.config.ts` and `app/globals.css` for the
full token set, and `components/blocks.tsx` for the reusable pieces
(Eyebrow, TestimonialCard, ServiceSplit, DarkCta, etc.).

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
key, registered in the CRM's `SITE_CONFIGS` with both `callcaitlyn.com` and
`www.callcaitlyn.com` allowed for CORS. The general contact form posts
`form: "contact"`; the two Work With Me forms both post `form:
"work_with_me"` (the CRM's pre-labeled key for that page), with an
`"Inquiry type": "Buy" | "Sell"` field carrying the distinction instead of
a separate form key per inquiry type.

## Content notes

- `lib/content.ts` holds the stats, testimonials, differentiators, and
  service-area data — all pulled from Caitlyn's real, already-public
  colivingcait.com (Zillow reviews, "7 Years Experience," service counties),
  not fabricated.
- `lib/initiatives.ts` holds the House Hacking ATL / CoLivingCait / Atlanta
  Women Investors links shown in the footer.
- The About page's bio and headshot are placeholders — swap in your own
  photo and story before this goes live.
