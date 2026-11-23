# Who signs up, and what works (marketing insights)

## What gets collected
- **"About you"** (onboarding step 3, first-time visitors only, all optional, Skip button):
  age range (13+ only), where they heard about Crawler, who they are, product stage, main goal.
- **Where they first came from**, captured automatically on their first visit (stored in their browser
  until they sign up): link tags like `?utm_source=tiktok&utm_campaign=launch`, and the domain of the
  site that sent them (e.g. `www.tiktok.com`). Nothing is sent until they create an account.
- Saved in Supabase table `signup_answers` (migration 0018). Users can only read their own row; nobody
  can write directly (only `save_signup_answers`, which keeps known answers only, first answer wins).

## Where to see it
- **crawler.studio/admin/insights** (admins only; your account is admin). Pick 7 / 30 / 90 / 365 days.
  For each channel, age, role, stage and goal: sign-ups, % who ran a test, % who paid, plus plain-English
  "what to do" tips. It waits for 10+ sign-ups per channel before comparing (small numbers lie).
- **Slack daily report**: a "Heard about us via: TikTok 3 · X / Twitter 1" line.

## Tag every link you post (most important habit)
People often skip questions, but link tags always work. Use one tag per place:
- TikTok bio: `https://crawler.studio/?utm_source=tiktok`
- A specific video: `https://crawler.studio/?utm_source=tiktok&utm_campaign=self-test-video`
- X post: `https://crawler.studio/?utm_source=x&utm_campaign=launch-thread`
- Product Hunt: `https://crawler.studio/?utm_source=producthunt`
- Waitlist launch email: `https://crawler.studio/?utm_source=waitlist&utm_campaign=launch-email`

## How to use it (every 1-2 weeks)
1. Which channel brings the most **paying** people per sign-up? Post more there, even if it's smaller.
2. Which channel brings sign-ups who never run a test? Their posts probably promise something different.
3. Biggest age group / role? Write examples, presets and home-page copy for them.
4. Re-check after changes; decide on 10+ sign-ups per channel, not 2.

## Privacy rules (keep them true)
- Ages start at 13; no data from younger kids.
- Totals only on the insights page; answers are never sold or shown publicly (the onboarding says so).
- Before a big launch, add a short privacy page that lists this (name, email, these answers, where you came from).
