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
5. Go to **Authentication → URL Configuration** and set **Site URL** to your real domain (e.g. `https://callcaitlyn.com`), and add `https://callcaitlyn.com/auth/confirm` (and a `localhost:3000` version if testing locally) to **Redirect URLs**.
6. Go to **Authentication → Emails → Templates → Magic Link** and replace `{{ .ConfirmationURL }}` in the link with `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/`. (This app verifies magic links via `token_hash` instead of the default PKCE `code` flow, because PKCE breaks when the link is opened in a different browser/app than the one that requested it — e.g. an email app's in-app browser.)
7. Go to **Project Settings → API** and copy the **Project URL** and **anon public** key.
8. (Recommended) Set up custom SMTP under **Authentication → Emails → SMTP Settings** — Supabase's built-in email sender has a very low rate limit. [Resend](https://resend.com) has a free tier that works well; you don't need a verified domain if you're only sending to your own email (the account you signed up to Resend with).

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
3. Add the same two environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the Vercel project settings — plus the Quo-related ones from the section below once you're setting that up.
4. Deploy. Then go back to Supabase **Authentication → URL Configuration** and add `https://your-app.vercel.app/auth/confirm` to the redirect URLs (and your custom domain's `/auth/confirm` once that's live).

## What's in phase 1

- **Dashboard** — active lead count, hot/ready count, follow-ups due today/overdue, recent activity, pipeline snapshot.
- **Contacts** — search and filter by stage/type/tag; full profile (contact info, budget, timeline, areas of interest, address, notes, tags); one-tap call/text/email links.
- **Activity timeline** — every call, text, email, note, meeting, or showing logged against a contact, plus automatic stage-change entries. Built with a `source` field (`manual`, `quo`, `gmail`, …) so future integrations write into the same timeline instead of a separate system.
- **Tasks** — follow-up reminders per contact, with due dates and priority.
- **Pipeline** — stage-grouped view (accordion on mobile, kanban columns on desktop) with a quick stage-move dropdown per contact.
- **Messages** — an iMessage/Quo-style inbox at `/messages`: a conversation list (most recent call/text per contact) and, per contact, a full chat thread with text bubbles, call log entries (with play/transcript), and a compose bar to send texts right from the thread.
- **Settings** — fully customize your pipeline stages (name, color, order) and tags. Nothing is hardcoded — this is meant to fit how *you* actually work, not a generic template.
- **Quo call/text sync** — a webhook receiver at `/api/webhooks/quo` logs every call and text against the matching contact's activity timeline automatically (auto-creating a bare contact for numbers it doesn't recognize, so nothing gets missed). Confirmed working end to end (calls, texts, recordings, transcripts, summaries). Signature verification is still in log-only mode — see step 6 below.
- **Calendly booking sync** — a webhook receiver at `/api/webhooks/calendly` logs new bookings (and cancellations) onto the matching contact's timeline, auto-creating a contact if the email/phone isn't recognized, and pulls the follow-up date forward to the meeting time if that's sooner than what's already set. See **Setting up Calendly** below — not yet tested against a real delivery.
- **Eventbrite registration sync** — a webhook receiver at `/api/webhooks/eventbrite` fetches attendee details when someone registers for an event, logs it on the matching contact (or creates one, or enriches an existing bare one with name/email), and tags them "Meetup". Confirmed working end to end.
- **Jotform check-in sync** — a webhook receiver at `/api/webhooks/jotform` matches in-person kiosk check-ins to existing contacts (from Eventbrite or elsewhere) by email/phone instead of creating duplicates, updates their last-event-attended date, and logs "how did you hear about us" + "house hacking journey" answers. Confirmed working end to end.
- **AI insights** — every inbound Quo text and every completed call transcript gets read by Claude, which decides whether it signals a stage or timeline change (e.g. "I'm ready to start looking" → suggest Hot/Ready) and writes a plain-English summary + suggested next action. Nothing changes automatically — it shows up as a card on the contact page with Apply/Dismiss buttons, so a wrong read never silently moves someone through your pipeline. Confirmed working end to end.
- **Send texts from the CRM** — a compose box on the contact page sends a text through your Quo number directly (no need to open the Quo app), and logs it on the timeline the same as an incoming one. Not yet tested against a real send — the request format is a best-effort guess, same situation the webhooks started in.

## Setting up AI insights

1. Get an API key at [console.anthropic.com](https://console.anthropic.com) → API Keys.
2. Add `ANTHROPIC_API_KEY` to Vercel, redeploy.
3. Text or call your Quo number, then check the contact page for a suggestion card. Uses Claude Haiku (cheap, fast) since this is a lightweight classification task, not a big reasoning job — costs should be negligible at your call/text volume.
4. Applying a suggestion updates the contact's stage/timeline and logs an activity (source `ai`) recording what changed and why. Dismissing just clears it — nothing on the contact changes.

## Sending texts from the CRM

Uses the `QUO_API_KEY` you already have set up — no new credential needed. Just try it: open any contact with a phone number, type a message in the box under the call/text/email buttons, and hit send. If it errors, paste me the error message it shows (it includes Quo's actual API response) and I'll fix the request shape to match.

## Setting up Quo (calling/texting sync)

This logs every call and text from your Quo number straight into each contact's activity timeline.

1. **Get your Supabase user ID and service role key** (server-only secret, different from the anon key):
   - Authentication → Users → copy the UID next to your email → this is `CRM_OWNER_USER_ID`.
   - Project Settings → API → copy the **service_role** key → this is `SUPABASE_SERVICE_ROLE_KEY`. Treat this like a password — it bypasses all database security. Never share it in chat or commit it to the repo.
2. **Get a Quo API key**: Quo → Settings → API (requires Owner/Admin on an active subscription) → this is `QUO_API_KEY`.
3. **Register the webhook.** There's no dashboard button for this — it has to be created via Quo's API, and I haven't been able to confirm the exact request shape against their live docs from here (my sandboxed environment can't reach quo.com). Open [quo.com/docs](https://www.quo.com/docs) in your own browser, find the "create a webhook" page, and paste me the example request — I'll turn it into the exact `curl` command for your account and lock in the webhook signing key (`QUO_WEBHOOK_SIGNING_KEY`) at the same time. In the meantime, the receiver works with signature verification in log-only mode, so we can get it running now and harden it once confirmed.
4. Add all four env vars (`CRM_OWNER_USER_ID`, `SUPABASE_SERVICE_ROLE_KEY`, `QUO_API_KEY`, `QUO_WEBHOOK_SIGNING_KEY`) to Vercel and redeploy.
5. Once a real call/text comes in, check that it shows up on the right contact's timeline. If Quo's actual field names differ from what the code guesses, nothing is lost — the full raw payload is saved on the activity's `metadata.raw`, so we can adjust the parsing from real data.
6. Set `CRM_QUO_ENFORCE_SIGNATURE=true` once the signature format is confirmed working, so the endpoint starts rejecting anything not actually from Quo. **Still open** — works fine with enforcement off, just not hardened yet.

## Setting up Calendly (booking sync)

Same shape as Quo: a webhook logs bookings straight onto the matching contact.

1. **Get a Calendly Personal Access Token**: Calendly → Integrations → API & Webhooks → generate one → this is `CALENDLY_API_TOKEN`. Only needed once, to register the webhook.
2. **Find your organization URI**: with that token, run:
   ```
   curl -H "Authorization: Bearer YOUR_TOKEN" https://api.calendly.com/users/me
   ```
   Copy the `current_organization` value from the response.
3. **Register the webhook**:
   ```
   curl -X POST https://api.calendly.com/webhook_subscriptions \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://callcaitlyn.com/api/webhooks/calendly",
       "events": ["invitee.created", "invitee.canceled"],
       "organization": "YOUR_ORGANIZATION_URI",
       "scope": "organization"
     }'
   ```
   The response should include a signing key — that's `CALENDLY_WEBHOOK_SIGNING_KEY`. Like Quo, I haven't been able to confirm this request shape against Calendly's live docs from here, so if it errors, paste me the response and I'll adjust it.
4. Add `CALENDLY_API_TOKEN` and `CALENDLY_WEBHOOK_SIGNING_KEY` to Vercel, redeploy.
5. Book a test appointment on your own Calendly link and confirm it shows up on the right contact (or creates a new one).
6. Set `CRM_CALENDLY_ENFORCE_SIGNATURE=true` once confirmed working.

## Setting up Eventbrite (registration sync)

Eventbrite webhooks only send a link to the changed resource, not the data itself, so this fetches attendee details back from their API when a registration comes in — and tags the contact "Meetup". Unlike Quo/Calendly, Eventbrite doesn't offer webhook signature verification, so this is secured with a secret you choose yourself, baked into the webhook URL.

1. Pick any long random string — this is `EVENTBRITE_WEBHOOK_SECRET`.
2. Eventbrite → **Account Settings → Developer Links → Webhooks → Add Webhook**:
   - **Payload URL**: `https://callcaitlyn.com/api/webhooks/eventbrite?secret=YOUR_SECRET` (using the string from step 1)
   - **Event**: All Events
   - **Actions**: check only `order.placed`
   - Save.
3. **Account Settings → Developer Links → API Keys** → copy your **Private Token** → this is `EVENTBRITE_API_TOKEN`.
4. Add `EVENTBRITE_API_TOKEN` and `EVENTBRITE_WEBHOOK_SECRET` to Vercel, redeploy.
5. Register for one of your own events as a test and confirm it shows up on the right contact, tagged "Meetup".

## Setting up Jotform (in-person meetup check-in)

For the iPad kiosk form: matches by email/phone against existing contacts (so people who already registered on Eventbrite, or are already in the CRM, get updated instead of duplicated), tags them "Meetup", updates their **last event attended** date, and logs the submission — including the "how did you hear about us" and "house hacking journey" answers — on their timeline. Run the migration below first (adds the last-event-attended fields), then:

1. **Run the new migration**: open [`supabase/migrations/0002_last_event.sql`](./supabase/migrations/0002_last_event.sql) and run it in Supabase's SQL Editor, same as you did for the first one.
2. Pick any long random string — this is `JOTFORM_WEBHOOK_SECRET`.
3. In your Jotform form's builder: **Settings → Integrations → Webhooks** → add:
   ```
   https://callcaitlyn.com/api/webhooks/jotform?secret=YOUR_SECRET
   ```
4. Add `JOTFORM_WEBHOOK_SECRET` to Vercel, redeploy.
5. Submit a test entry on the kiosk form and confirm it shows up on the right contact.

Field-label matching for name/email/phone/etc. is fuzzy (matches on keywords like "name", "email", "phone", "hear", "journey"/"stage") since Jotform doesn't send predictable field IDs — if a submission doesn't match up correctly, the full raw text is saved in `metadata.raw_pretty` so we can adjust it.

### House hacking journey stage → pipeline mapping

Both Jotform and Eventbrite ask "Where are you at in your house hacking journey?" with four options, and both feed the same shared logic (`lib/crm/journey-stage.ts`):

| Answer | Stage (new contacts only) | Tags |
|---|---|---|
| Just researching | New Lead | House Hacking |
| Looking for my first house hack | Hot / Ready | House Hacking, First-Time Buyer |
| Already house hacking — looking for my next one | Hot / Ready | House Hacking, House Hacker |
| Currently house hacking — not actively looking right now | *(unchanged)* | House Hacking, House Hacker |

The stage is only ever set on a **brand-new** contact — an existing contact's stage reflects real relationship progress and never gets overwritten by a meetup form answer. The "House Hacking" and "House Hacker" tags only get applied when this question was actually asked and answered, which is also what keeps this scoped correctly to house-hacking events only — the women's meetups (and any other non-house-hacking event) won't include this question, so those registrants just get the generic "Meetup" tag and nothing else. Run [`supabase/migrations/0003_house_hacking_tags.sql`](./supabase/migrations/0003_house_hacking_tags.sql) to seed the two new tags.

Eventbrite's custom registration question is fetched from the attendee's `answers` array (matched by the question text containing "journey" or "house hacking") — this field shape isn't confirmed against a real payload yet, so if it doesn't come through, the full raw order is saved in the activity's `metadata.raw` for us to check.

## Roadmap (next phases)

Each of these needs its own API key/OAuth setup from your accounts before it can go live — the data model is already built to receive them (the `activities.source` and `metadata` columns exist specifically for this):

1. **Accountability metrics dashboard** — a new goals table plus a dashboard section for:
   - **Speed to lead** — average time from a contact being created to your first logged outbound call/text/email with them.
   - **Contacted %** — of active (non-closed, non-archived) contacts, what % have a logged activity in the last 7/30 days.
   - **Follow-up rate** — of tasks due in the period, what % got completed vs. left overdue.
   - **Conversion rate** — of leads created in the period, what % have reached "Closed - Client."

   Each metric gets a settable goal, an up/down arrow vs. last week/month, and a met/not-met indicator against the goal. Definitions above are proposed, not final — confirm before building.
2. **Gmail** — capture new leads from your inbox, log email activity on contacts. Deferred for now — needs either accepting once-a-day sync on Vercel's free plan, paying for Vercel Pro for near-real-time polling, or building real-time push via Gmail + Google Cloud Pub/Sub (more setup, still free).
3. **Newsletters & mass send** — AI-drafted emails in your voice, open/click tracking, scheduled sends to tagged audiences (e.g. promote a meetup to everyone tagged "Meetup").
4. **Scheduled touches by tag** — e.g. auto-text/email a segment on a date (birthday reminders, closing anniversaries — the `important_dates` table is already there for this).

### Ideas worth adding as a realtor/event manager (not yet built, flagged for later)

- **Closing-anniversary & birthday touches** — the `important_dates` table supports this now; automating the reminder/send is part of the newsletter phase.
- **Referral-source ROI** — `lead_source` is tracked per contact; a future report can show which sources actually convert to closings, so you know where to spend marketing effort.
- **Showing feedback capture** — a lightweight form logged as a `showing` activity right after each showing, so feedback doesn't live in your head or a text thread.
- **Past-client drip** — auto-tag anyone whose stage becomes "Closed - Client" and schedule periodic just-checking-in touches — the #1 way past clients turn into referrals.
- **Duplicate detection** — warn when a new contact's phone/email matches an existing one, so leads from different channels (website, Eventbrite, sign call) don't fragment into duplicates.
- **"Sphere" nurture cadence** — a separate lighter-touch cadence for sphere/referral-partner contacts vs. active buyers/sellers, since they need a different follow-up rhythm.
- **Engagement-based tagging** — behavior as its own signal, separate from what a contact explicitly says: texting/calling multiple times a week, opening every newsletter, clicking links in emails. High-frequency engagement could auto-tag or nudge stage independently of the AI insight (which is per-activity-content) - this would be a per-contact rolling engagement score computed from activity frequency, plus email open/click data once the newsletter/email-tracking phase exists.

## Project structure

```
app/(app)/                    Authenticated pages (dashboard, contacts, pipeline, settings)
app/login/                    Magic-link sign-in
app/auth/confirm/             Supabase auth magic-link verification handler
app/api/webhooks/quo/         Quo call/text webhook receiver
app/api/webhooks/calendly/    Calendly booking webhook receiver
app/api/webhooks/eventbrite/  Eventbrite registration webhook receiver
app/api/webhooks/jotform/     Jotform in-person check-in webhook receiver
components/                   UI, nav, contact, dashboard, settings, messages components
lib/data/                     Server-side data fetching (Supabase queries)
lib/supabase/                 Supabase client/server/middleware/admin helpers
lib/crm/                      Shared integration logic: find-or-create contact, activity upsert, event attendance
lib/quo/                      Quo-specific webhook parsing, signature verification, sending texts
lib/calendly/                 Calendly-specific webhook parsing + signature verification
lib/eventbrite/               Eventbrite-specific API client + attendee parsing
lib/jotform/                  Jotform-specific submission parsing
lib/ai/                       Claude-based activity analysis (stage/timeline suggestions)
lib/validation/                Zod schemas for forms
supabase/migrations/           Database schema (run in Supabase SQL Editor)
types/database.ts              Hand-written types matching the schema
```
