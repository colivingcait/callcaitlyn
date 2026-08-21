# Caitlyn Verdugo — public site

A standalone Next.js app (separate from the CRM in this repo — see the repo
root's own README) meant to serve `callcaitlyn.com` / `www.callcaitlyn.com`
as a hub linking out to three properties: House Hacking ATL, CoLivingCait,
and Atlanta Women Investors.

This lives at `/site` as a draft — where it ends up deploying from
(this subdirectory vs. its own repo/branch root) is still being decided.

## Run it locally

```
cd site
npm install
cp .env.example .env.local   # fill in Resend keys, see below
npm run dev
```

## Contact form

The `/contact` page's form POSTs to `/api/contact`, which sends an email via
[Resend](https://resend.com) rather than writing to a database — this site
has no database of its own, unlike the CRM.

1. Create a Resend account and API key.
2. Verify a sending domain (e.g. `callcaitlyn.com`) under **Domains** — until
   you do, you can only send from `onboarding@resend.dev` to the email
   address on your own Resend account, which is fine for local testing but
   not for real visitor submissions.
3. Set `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, and `CONTACT_FROM_EMAIL` in
   Vercel (and `.env.local` for local dev).

## Content notes

- `lib/initiatives.ts` is the one place the House Hacking ATL / CoLivingCait
  / Atlanta Women Investors summaries and links live — used on the homepage
  and footer.
- The About page's bio and headshot are placeholders — swap in your own
  photo and story before this goes live.
- `app/events/page.tsx` lists the two recurring meetups with what's publicly
  confirmed (Atlanta Women Investors' monthly cadence); update it directly
  if either schedule changes.
