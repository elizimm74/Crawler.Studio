# Launch: Friday, December 5, 2026

Your checklist for the week before and the day itself. Tick things off as you go.
Anything marked **(parent)** needs your parent/guardian (they own the Stripe account).

---

## Before launch (Nov 27 – Dec 3)

### 1. The live site runs the newest version (do this first)
- [ ] Upload the newest zip to the `crawler-for-vercel` Vercel project (or, better: connect it to
      GitHub `elizimm74/Crawler.Studio`, branch `claude/milestone-1-prototype`, so every push goes live).
- [ ] Check: https://crawler.studio/pricing shows **no Annual toggle** and a "Just need one test?" section
      ($9 / $19 / $29 / $49). https://crawler.studio/terms opens.
- [ ] Sign in and open the dashboard and an old report: they must load. (The database was locked down on
      Nov 26, so the OLD website version can't open reports.)

### 2. The AI works
- [ ] New key from the Anthropic Console → paste as `ANTHROPIC_API_KEY` in **Railway** (worker) AND
      **Vercel** (web). Redeploy both. Never paste it in chat.
- [ ] Run one website test and one app test on crawler.studio. Read both reports end to end.
- [ ] Ask one question in the "Ask about this test" box (uses the key on Vercel).

### 3. Payments **(parent)**
- [ ] Stripe → Settings → Business → Public details: name = **Crawler**, website = crawler.studio,
      support email = support@crawler.studio, Terms = https://crawler.studio/terms,
      Privacy = https://crawler.studio/privacy, Refunds = https://crawler.studio/refunds.
- [ ] TEST MODE first, with card 4242 4242 4242 4242: subscribe to Starter, pay for one analysis,
      upgrade to Growth, cancel in Manage billing. Each should show up on the dashboard within seconds.
- [ ] Webhook events selected: `customer.subscription.created`, `customer.subscription.updated`,
      `customer.subscription.deleted`, `invoice.paid`, `checkout.session.completed`.
- [ ] Switch to LIVE: live `STRIPE_SECRET_KEY` + a new live webhook (https://crawler.studio/api/stripe/webhook)
      and its `STRIPE_WEBHOOK_SECRET` on Vercel. Redeploy.
- [ ] Optional but smart: buy the $9 analysis yourself with a real card, then refund it in Stripe.

### 4. Email
- [ ] Create the inbox **support@crawler.studio** (it's on the Terms, Privacy and Refund pages and in Checkout).
- [ ] Resend: add crawler.studio, add its DNS records in Squarespace, wait for "Verified".
- [ ] Supabase → Authentication → Emails → SMTP settings: use Resend (so sign-up emails actually arrive).
- [ ] Supabase → Authentication → URL Configuration: Site URL `https://crawler.studio`,
      Redirect URLs include `https://crawler.studio/**`.
- [ ] Sign up with a brand-new email address and make sure the confirmation email arrives.

### 5. Legal + people
- [ ] Your parent reads /terms, /privacy and /refunds (drafts; change anything that isn't how you want to run things).
- [ ] Written OK from Rubin's parent/guardian for the case study, or tell Claude to hide it
      (`published: false` in `src/lib/caseStudies.ts`).
- [ ] Revoke Apple key GQQQ8DZAFN, make a new one, update the Apple secret in Supabase.

### 6. Hosting
- [ ] Vercel → upgrade to **Pro** (the free Hobby plan is non-commercial only).
- [ ] Railway: the worker is on a paid plan (not a trial that ends), ~2 GB memory, all 6 variables set.
- [ ] GitHub Pages (elizimm74.github.io/Study): turn it off, or make it point people to crawler.studio.

### 7. Final check (Dec 3)
- [ ] Tell Claude "the site is uploaded": it runs the full site check against crawler.studio.
- [ ] On your own phone: home → Get started → test a website → report → pricing.

**Dec 4: nothing new goes live.** Rest, and write your launch posts.

---

## Launch day (Dec 5)

The launch offer runs automatically from Dec 5 00:00 to Dec 12 23:59 US Eastern: the first 100 people
who sign up and verify their email get 1,000 free simulated customers (one free 1,000-customer test).
The home page and pricing page count the spots left. You don't need to switch anything on.
Check how many were given: Supabase → SQL → `select public.launch_offer_status();`

| Time (ET) | Do this |
| --- | --- |
| 8:00 | Open crawler.studio on your phone and laptop. Run one small test yourself. Check Slack works. |
| 8:30 | Send the waitlist launch email: `npm run waitlist:send -- --test you@email.com` first, then `--send`. |
| 9:00 | Post on X (and TikTok/Instagram). Pin the post. Link: https://crawler.studio |
| 9:00–12:00 | Reply to every comment and DM. Watch Slack for sign-ups, payments and failed tests. |
| 12:00 | Check the queue: tests should finish in a few minutes. If many sit "waiting", raise `WORKER_CONCURRENCY` on Railway (needs more memory). |
| Evening | Read the Slack digest. Note the top "heard about us" source and the most common blocker. |

### If something breaks
- **Tests stuck on "waiting"**: the Railway worker is down or overloaded → Railway → restart; check its logs.
- **"Something went wrong with the AI"**: the Anthropic key is wrong or out of credit → check the
  Console (billing + key), fix the variable in Railway and Vercel.
- **Payments not unlocking**: Stripe → Developers → Webhooks → look for failed deliveries (red).
  Resend the failed event once the problem is fixed.
- **Sign-up emails not arriving**: Supabase SMTP settings (step 4) / Resend dashboard.
- **Someone asks for a refund**: follow /refunds; refund in the Stripe dashboard.

Paste any error message to Claude (never keys or passwords).
