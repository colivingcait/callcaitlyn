# CallCaitlyn CRM

A real estate CRM built for one agent: contacts, pipeline stages, follow-up
tasks, and an activity timeline — mobile-first, with a full desktop layout
too. This is phase 1 (core CRM). Integrations (Quo, Gmail, Eventbrite,
Jotform, Calendly, AI insights, newsletters) come next, one at a time — see
**Roadmap** below.

## Stack

- **Next.js 15** (App Router, TypeScript) — the web app, mobile-responsive by default
- **Supabase** — Postgres database, auth (email magic link), row-level security
- **Tailwind CSS** — styling
- **Vercel** — recommended hosting (free tier is enough for this)

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com), sign up, and create a new project.
2. Once it's ready, open **SQL Editor** in the left sidebar.
3. Paste in the full contents of [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql) and run it. This creates every table, security policy, and seeds sensible default pipeline stages ("New Lead", "Contacted", "Nurturing", "Hot / Ready", "Under Contract", "Closed - Client", "Past Client", "Lost / Not Now") and starter tags — you can rename, reorder, add, or delete any of these later from the Settings page in the app.
4. Go to **Authentication → Providers** and make sure **Email** is enabled. This app signs in with a magic link (no passwords), which is simplest on a phone.
5. Go to **Authentication → URL Configuration** and add your site URL (e.g. `http://localhost:3000` for local dev, and your Vercel URL once deployed) to the **Redirect URLs** list, each followed by `/auth/callback` (e.g. `http://localhost:3000/auth/callback`).
6. Go to **Project Settings → API** and copy the **Project URL** and **anon public** key.

## 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the two values from step 1.6:

```
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 3. Run it locally

```
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it'll redirect you to
`/login`. Enter your email, check your inbox for the magic link, and you're
in. The first time you sign in, Supabase creates your user and the database
trigger seeds your pipeline stages and starter tags automatically.

On your phone: open the deployed URL in Safari/Chrome and use "Add to Home
Screen" — it's configured as an installable web app (`manifest.json`), so it
opens full-screen like a native app.

## 4. Deploy to Vercel

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. Go to [vercel.com](https://vercel.com), **Add New Project**, import this repo.
3. Add the same two environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the Vercel project settings.
4. Deploy. Then go back to Supabase **Authentication → URL Configuration** and add `https://your-app.vercel.app/auth/callback` to the redirect URLs.

## What's in phase 1

- **Dashboard** — active lead count, hot/ready count, follow-ups due today/overdue, recent activity, pipeline snapshot.
- **Contacts** — search and filter by stage/type/tag; full profile (contact info, budget, timeline, areas of interest, address, notes, tags); one-tap call/text/email links.
- **Activity timeline** — every call, text, email, note, meeting, or showing logged against a contact, plus automatic stage-change entries. Built with a `source` field (`manual`, `quo`, `gmail`, …) so future integrations write into the same timeline instead of a separate system.
- **Tasks** — follow-up reminders per contact, with due dates and priority.
- **Pipeline** — stage-grouped view (accordion on mobile, kanban columns on desktop) with a quick stage-move dropdown per contact.
- **Settings** — fully customize your pipeline stages (name, color, order) and tags. Nothing is hardcoded — this is meant to fit how *you* actually work, not a generic template.

## Roadmap (next phases)

Each of these needs its own API key/OAuth setup from your accounts before it can go live — the data model is already built to receive them (the `activities.source` and `metadata` columns exist specifically for this):

1. **Quo (calling/texting)** — confirmed feasible: Quo (formerly OpenPhone) has a REST API (`api.openphone.com/v1`) with contact sync and webhooks for `call.completed`, `call.recording.completed`, and `message.received`/`message.delivered`. Once you generate an API key in Quo (Settings → API, requires Owner/Admin), we wire up a webhook receiver that logs every call/text straight into each contact's timeline, including recordings/transcripts where available.
2. **AI status detection & insights** — using an Anthropic API key, analyze new activity (especially texts) to auto-suggest stage changes ("I'm ready to start looking" → move to Hot/Ready) and generate a running action-item list per contact.
3. **Gmail** — capture new leads from your inbox, log email activity on contacts, and lay the groundwork for mass email/newsletters.
4. **Calendly** — new bookings auto-create or update contacts.
5. **Eventbrite** — event registrations auto-populate as leads.
6. **Jotform** — in-person event registrations/details flow straight into contacts with the right stage.
7. **Newsletters & mass send** — AI-drafted emails in your voice, open/click tracking, scheduled sends to tagged audiences (e.g. promote a meetup to everyone tagged "Meetup").
8. **Scheduled touches by tag** — e.g. auto-text/email a segment on a date (birthday reminders, closing anniversaries — the `important_dates` table is already there for this).

### Ideas worth adding as a realtor/event manager (not yet built, flagged for later)

- **Closing-anniversary & birthday touches** — the `important_dates` table supports this now; automating the reminder/send is part of the newsletter phase.
- **Referral-source ROI** — `lead_source` is tracked per contact; a future report can show which sources actually convert to closings, so you know where to spend marketing effort.
- **Showing feedback capture** — a lightweight form logged as a `showing` activity right after each showing, so feedback doesn't live in your head or a text thread.
- **Past-client drip** — auto-tag anyone whose stage becomes "Closed - Client" and schedule periodic just-checking-in touches — the #1 way past clients turn into referrals.
- **Duplicate detection** — warn when a new contact's phone/email matches an existing one, so leads from different channels (website, Eventbrite, sign call) don't fragment into duplicates.
- **"Sphere" nurture cadence** — a separate lighter-touch cadence for sphere/referral-partner contacts vs. active buyers/sellers, since they need a different follow-up rhythm.

## Project structure

```
app/(app)/         Authenticated pages (dashboard, contacts, pipeline, settings)
app/login/          Magic-link sign-in
app/auth/callback/   Supabase auth redirect handler
components/          UI, nav, contact, dashboard, settings components
lib/data/            Server-side data fetching (Supabase queries)
lib/supabase/        Supabase client/server/middleware helpers
lib/validation/       Zod schemas for forms
supabase/migrations/  Database schema (run in Supabase SQL Editor)
types/database.ts     Hand-written types matching the schema
```
