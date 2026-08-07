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

- **Dashboard** — active lead count (only stages not marked closed — see below), hot/ready count, follow-ups due today/overdue, recent activity, pipeline snapshot, and an accountability section (see below).
- **Accountability metrics** — speed to lead, contacted %, follow-up rate, and conversion rate, each with a week/month toggle, a trend arrow vs. the prior period, and a settable goal (click "Set a goal" under any metric). See **How the metrics are defined** below for exactly what each one measures.
- **Engagement tagging** — a contact gets tagged "Engaged" automatically once they've had 3+ calls/texts (either direction) in the trailing 7 days, recomputed after every new call/text rather than on a schedule. Email-based engagement (opens/clicks) is noted for later, once the newsletter/email-tracking phase exists.
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

## Setting up the metrics dashboard

1. Run [`supabase/migrations/0005_metrics.sql`](./supabase/migrations/0005_metrics.sql) in Supabase's SQL Editor — flips "Past Client" to a closed stage (see below) and adds the `metric_goals` table.
2. Run [`supabase/migrations/0006_deals_and_trash.sql`](./supabase/migrations/0006_deals_and_trash.sql) too — adds the `deals` table (permanent conversion history, see below) and a Trash status for stages.
3. That's it — no new env vars or credentials. The dashboard picks it up automatically.
4. In **Settings → Pipeline stages**, each stage now has an Active / Closed / Trash dropdown, plus a "Win" checkbox that only shows up once a stage is set to Closed:
   - **Active** — counts as an active lead and in the metrics below.
   - **Closed** — the relationship reached an end state; check "Win" if it means they became a client (this is what the conversion-rate metric and the `deals` history use). Leave unchecked for a closed-lost stage like "Lost / Not Now".
   - **Trash** — not a real lead at all (spam, wrong number, unrelated). Moving a contact into a Trash stage **archives them immediately** — same as hitting Archive on their profile — so they disappear from your contact list and every metric, and you never have to look at them again.

### How the metrics are defined

- **Active leads** (dashboard stat tile): non-archived contacts whose stage isn't marked Closed or Trash. Driven by the per-stage flags above, not hardcoded stage names, so it stays correct if you rename/add stages.
- **Speed to lead**: for non-archived contacts created in the selected period, the average time from creation to your first logged outbound call/text/email with them. Contacts not yet contacted are excluded from the average rather than counted as infinite.
- **Contacted %**: of currently-active contacts, what % have any logged activity (call/text/email/note/meeting/showing) within the selected period.
- **Follow-up rate**: of tasks *due* in the selected period, what % have been completed (as of now, not necessarily completed on time). Tasks tied to a since-trashed contact don't count against you; general tasks with no contact always count.
- **Conversion rate**: of non-archived contacts *created* in the selected period, what % have *ever* closed a deal (see below) — not just whatever stage they're in right now. Since older cohorts have had more time to convert than the current period's, this naturally trends better for the "previous period" comparison — a known simplification, not a bug, for a lightweight personal dashboard rather than full cohort-normalized reporting.

Each metric's trend arrow accounts for which direction is "good" — lower is better for speed to lead, higher is better for the three percentages.

### Deals (repeat-conversion tracking + under-contract capture)

A contact's *current* stage can't be the source of truth for "have they ever converted" — an investor can close a deal, then go right back to actively shopping for the next property, cycling back through your active pipeline. So closing is recorded separately in a `deals` table, decoupled from the contact's stage.

A deal has a lifecycle:

1. **Under Contract** — flag any active stage as "Under Contract" in Settings → Pipeline stages (the default seed stage already has this). The moment a contact enters that stage, a `deals` row is written with `status: pending`, and a details modal pops up asking for everything you'd already know at that point: address, property type, which side you're on, sale price, gross commission, referral %, misc fee, OZ fee, when you started working with them (defaults to their lead-created date, editable), and notes — or hit "Skip for now" and fill it in later. Nothing here is deferred to the eventual close; the modal is identical to the one that shows up when a deal actually closes.
2. **Falls through** — if the contact's stage moves off Under Contract *without* reaching a Win stage, the pending row is deleted automatically. It was never a real conversion, so it doesn't linger or skew any metrics.
3. **Closes** — when the contact enters a stage marked "Win," the same pending row (if one exists — a deal can also close without ever passing through Under Contract) is finalized to `status: won`, and the same modal reopens in case anything changed (e.g. the final sale price) before closing.

This all happens automatically no matter how the stage change happens — the dropdown on a contact's profile, the pipeline board, or applying an AI suggestion. Only `won` deals count toward the conversion-rate metric and the commission tracker; `pending` ones are informational only. The contact's profile page lists every deal (both pending and won) with an edit (pencil) and delete (✕) icon on each — delete is for the "oops, wrong stage" case; edit is always available since those fields are just data entry, not conversion history. Run [`supabase/migrations/0008_deal_details.sql`](./supabase/migrations/0008_deal_details.sql) and [`supabase/migrations/0010_under_contract.sql`](./supabase/migrations/0010_under_contract.sql) to add these.

### Buyer/seller tracking

Every contact can now be tagged **Representing: Buyer, Seller, or Buy/Sell** — a small colored badge next to their name on the contacts list, pipeline board, and profile page. This is separate from "Type" (buyer/seller/investor/referral partner/etc.), which is more of a general category — Representing is specifically about which side of a transaction they're on right now. Sellers (or Buy/Sell contacts) get two extra fields on their profile: **listing address** and **listing timeline**, mirroring the budget/areas-of-interest/timeline fields buyers already had. Run [`supabase/migrations/0007_buyer_seller.sql`](./supabase/migrations/0007_buyer_seller.sql) — it also does a best-effort backfill of Representing from each contact's existing Type.

### Likelihood to close (pipeline board)

A small High/Med/Low badge shows up next to active contacts on the pipeline board and profile page, as a first pass at "who in the pipeline is most likely to close soon." It's a deterministic score (not an AI call) from three inputs already on the contact: how far along their stage is, how urgent their timeline is, and whether they're tagged "Engaged" (3+ calls/texts in the last 7 days) — instant, free, and transparent about what's driving it. This is intentionally a coarse first pass, not deep conversation analysis; closed/lost/trash contacts don't get a score since the question doesn't apply to them anymore.

## Commission tracker

Reachable from the $ icon next to Settings (mobile) or the sidebar (desktop) at `/commissions`. It's built entirely from your closed (`won`) deals — nothing to enter separately — and mirrors your KW commission-year structure:

- **KW**: 30% of (gross commission − referral fee), until you've paid $15,000 total for the commission year — then $0.
- **KWRI**: 3% of the same base, capped at $3,000 for the year.
- **FMLS**: 0.12% of sale price, no cap — only for deals where the "On FMLS" checkbox is checked (defaults on, since most are; uncheck it per-deal for the ones that aren't).
- **TC**: flat $500 per transaction, every deal, no cap.
- **Referral fee**: gross commission × the referral % you enter per deal, taken off the top *before* KW/KWRI are calculated — matches "referral is taken off the top, prior to any splits."
- **OZ and Misc**: no formula (OZ isn't applicable to new deals since KW discontinued it, kept only for old deals that predate that) — both are whatever you typed on the deal.

The **commission year runs Dec 1 – Nov 30**, not the calendar year — the caps reset at the start of each one. Because the KW/KWRI caps are cumulative, the calculation walks every `won` deal in a year in closing-date order — editing a deal's numbers, or deleting one, correctly recalculates every deal that closed after it in that same year. Use the year toggle at the top of the page to look at a different commission year; the page always includes the current one even before you've closed anything in it.

The page shows the full deal-by-deal table (closing date, address, sale price, commission %, gross comp, side, every fee column, net commission, % of comm, % of list price) plus summary stats: total deals, volume, GCI, net commission, average sale price, average commission rate, average net per deal, buyer/seller split, a fee breakdown (with a note once you've hit the KW or KWRI cap for the year), and a lead-source breakdown. Run [`supabase/migrations/0009_commission_tracker.sql`](./supabase/migrations/0009_commission_tracker.sql) to add the columns this needs.

**Importing past deals**: two ways, both on the Commissions page, neither requiring a contact record first:

- **Add past deal** — one deal at a time, same fields as the regular deal modal (client name instead of a linked contact).
- **Bulk import** — paste rows copied straight from a spreadsheet (a header row + data rows, tab- or comma-separated). It recognizes Address/Client Name, Closing Date, Sale Price, Gross Comp, Side, Misc, OZ, and either Referral %/FMLS (Yes/No) or KW/KWRI/FMLS/TC/Referral Fees as dollar amounts, all by column name — case-insensitive, and tolerant of copying your *entire* existing commission tracker as-is, since anything it doesn't recognize (Total Fees, Net Comm, the % columns, etc.) is just ignored. Shows a preview (with any skipped rows and why) before you confirm the import.

Both forms have a **"Use exact fee amounts instead of calculating them"** checkbox (on by default for backfilling, since a past deal's real fees are usually already known) — check it to enter your actual historical KW, KWRI, FMLS, TC, and referral dollar amounts exactly as they were, instead of letting the formula reconstruct them. Those exact amounts still count toward that commission year's KW/KWRI running cap totals (so future deals in the same year see accurate remaining room) — they just aren't clamped by the cap themselves, since they already happened. Uncheck it to have those four calculated from sale price/gross commission instead, same as any newly-closing deal. A deal using exact amounts shows a small "Manual fees" label in the Commissions table, and the same checkbox is available when editing any deal later (pencil icon) to switch it between manual and calculated.

Either way, these deals count toward the KW/KWRI caps for whichever commission year their closing date falls in, exactly like any other deal, and can be edited or removed later from the pencil/✕ icons in the Commissions table itself, since they have no contact profile to manage them from. Run [`supabase/migrations/0011_standalone_deals.sql`](./supabase/migrations/0011_standalone_deals.sql) to make `contact_id` optional on deals, [`supabase/migrations/0012_fmls_toggle.sql`](./supabase/migrations/0012_fmls_toggle.sql) to add the "On FMLS" checkbox, and [`supabase/migrations/0013_manual_splits.sql`](./supabase/migrations/0013_manual_splits.sql) to add the exact-fee-amount columns.

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

1. **Gmail** — capture new leads from your inbox, log email activity on contacts. Deferred for now — needs either accepting once-a-day sync on Vercel's free plan, paying for Vercel Pro for near-real-time polling, or building real-time push via Gmail + Google Cloud Pub/Sub (more setup, still free).
2. **Newsletters & mass send** — AI-drafted emails in your voice, open/click tracking, scheduled sends to tagged audiences (e.g. promote a meetup to everyone tagged "Meetup"). Would also unlock email-based engagement tagging (see above).
3. **Scheduled touches by tag** — e.g. auto-text/email a segment on a date (birthday reminders, closing anniversaries — the `important_dates` table is already there for this).

### Ideas worth adding as a realtor/event manager (not yet built, flagged for later)

- **Closing-anniversary & birthday touches** — the `important_dates` table supports this now; automating the reminder/send is part of the newsletter phase.
- **Referral-source ROI** — `lead_source` is tracked per contact; a future report can show which sources actually convert to closings, so you know where to spend marketing effort.
- **Showing feedback capture** — a lightweight form logged as a `showing` activity right after each showing, so feedback doesn't live in your head or a text thread.
- **Past-client drip** — auto-tag anyone whose stage becomes "Closed - Client" and schedule periodic just-checking-in touches — the #1 way past clients turn into referrals.
- **Duplicate detection** — warn when a new contact's phone/email matches an existing one, so leads from different channels (website, Eventbrite, sign call) don't fragment into duplicates.
- **"Sphere" nurture cadence** — a separate lighter-touch cadence for sphere/referral-partner contacts vs. active buyers/sellers, since they need a different follow-up rhythm.
- **Email-based engagement** — the call/text half of this is now live (the "Engaged" tag, see above). The email half — opening every newsletter, clicking links — needs the newsletter/email-tracking phase to exist first, then can feed the same tag.

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
lib/crm/                      Shared integration logic: find-or-create contact, activity upsert, event attendance, engagement tagging
lib/quo/                      Quo-specific webhook parsing, signature verification, sending texts
lib/calendly/                 Calendly-specific webhook parsing + signature verification
lib/eventbrite/               Eventbrite-specific API client + attendee parsing
lib/jotform/                  Jotform-specific submission parsing
lib/ai/                       Claude-based activity analysis (stage/timeline suggestions)
lib/validation/                Zod schemas for forms
supabase/migrations/           Database schema (run in Supabase SQL Editor)
types/database.ts              Hand-written types matching the schema
```
