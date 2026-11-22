# Your pulse: Crawler stats on your phone (Slack)

Crawler posts into a private Slack channel. Install the Slack app on your phone and turn on
notifications for that channel: you get a buzz for every sale.

## What you get
**Live alerts** (within ~20 seconds):
- :moneybag: every payment (first month + every renewal), with today's total, MRR and all-time revenue
- :tada: your first ever payment · :trophy: a new record day · :rocket: milestones ($1k all-time, $500 MRR...)
- new subscriber / cancelled / payment failed / payment fixed / plan ended
- new sign-ups (with 10 / 100 / 1,000 account milestones) and waitlist joins
- a failed test or analysis, with the reason (so a broken worker never goes unnoticed)

**Daily report** at 9pm your time: revenue today / this week / this month / all-time, MRR by plan,
AI cost and rough profit, sign-ups, accounts, waitlist, tests and simulated customers, records
(best revenue day, most sign-ups, most tests), sales streak, and things to watch (failing payments,
people cancelling, failed tests).

Emails are shortened to `j***@gmail.com`. Profit = revenue minus AI cost only (not Stripe's fee,
hosting or anything else).

## Switch it on (5 minutes)
1. In Slack, make a channel, e.g. `#crawler-pulse`.
2. Go to https://api.slack.com/apps > **Create New App** > **From scratch**, name it "Crawler Pulse", pick your workspace.
3. **Incoming Webhooks** > turn **On** > **Add New Webhook to Workspace** > pick `#crawler-pulse` > Allow.
4. Copy the webhook URL (`https://hooks.slack.com/services/...`). It's a SECRET: anyone with it can post in your channel.
5. Railway > crawler-worker > **Variables** > add `SLACK_WEBHOOK_URL` = that URL. (Only the worker needs it.)
6. Optional variables:
   - `DIGEST_TZ` (default `America/New_York`), e.g. `America/Los_Angeles`
   - `DIGEST_HOUR` (default `21` = 9pm)
   - `SLACK_SKIP` = `signup,waitlist` to mute those once there are lots of them
7. On your phone: Slack > the channel > bell icon > **All new messages**.

Railway restarts the worker with the new variable; its log says `pulse on`.

## How it works (for explaining it)
- Database triggers (`supabase/migrations/0016_ops_alerts.sql`) write a row into `ops_events`
  whenever something happens. They're wrapped so an alert can never break a sign-up or payment.
- The Stripe webhook saves every paid invoice into `payments` (the real revenue list).
- The worker (`src/worker/pulse.ts`) posts new events to Slack every 20s, and the daily report once a
  day (`ops_digest`). `ops_claim_events` / `ops_claim_digest` (0017) make sure nothing is posted twice.
- The words are written by `src/lib/ops.ts` (checked by `npm run bench`).
- Events older than a day are dropped quietly, so turning Slack on later doesn't flood your phone.
