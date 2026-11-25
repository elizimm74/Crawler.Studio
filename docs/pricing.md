# Crawler pricing (final, 2026-11-25)

1 **Crawler** = 1 simulated customer. A test uses as many Crawlers as it simulates (100, 250, 500 or 1,000).

| Plan | Price | Crawlers | Ad Analysis | Extra |
|---|---|---|---|---|
| Free trial | $0, once | 25 (one test) | no | report is a **preview** until they pay |
| Starter | $19/mo | 1,000 / month | **no** | |
| Growth (most popular) | $49/mo | 5,000 / month | yes | |
| Pro | $99/mo | 15,000 / month | yes | priority processing |
| Agency | $199/mo | 40,000 / month | yes | highest priority, expanded history (100 tests on the dashboard) |
| Enterprise | custom | custom | yes | "Need more Crawlers?" form -> /admin/insights + Slack |

One-time **Crawler packs** (no subscription, never expire, no Ad Analysis): 500 $9 · 2,000 $29 · 10,000 $99 · 25,000 $199.

Where it lives:
- Prices and rules: `src/lib/plans.ts` (the ONE place in code).
- Database limits: `supabase/migrations/0023_pricing_v4.sql` (`plan_customers`, `plan_has_ads`, `plan_priority`, `pack_crawlers`, `start_test`, `my_plan`). **Change both together.**
- Pricing page: `src/app/pricing/page.tsx`, `src/components/pricing/*`.
- Stripe: `src/lib/stripe.ts`, `src/app/api/checkout/route.ts`, `src/app/api/stripe/webhook/route.ts`.

## How a test is paid for (the database decides, never the browser)
1. Admin: unlimited.
2. A live monthly/annual plan: this month's Crawlers first, then pack Crawlers on top.
3. Packs only: pack Crawlers (not for Ad Analysis).
4. Nothing paid: the free trial (25 Crawlers, once; +1 full test for 3 verified invites, unchanged).

A failed test gives its pack Crawlers back and never counts against the month. Annual plans still reset every month (same day of the month as the start). The trial's Crawlers never count against a later plan.

## Decisions I made (change them any time)
- **Annual price** = 10 months' price for 12 ("2 months free"): `ANNUAL_MONTHS_PAID` in plans.ts. Your brief asked for the toggle but gave no annual price.
- **Black Friday**: 30% off the first 3 months of a MONTHLY plan, Nov 27 (00:00 US Eastern) to Dec 1 2026 (`BLACK_FRIDAY` in plans.ts).
- **Waitlist discount** "up to 30% depending on signups": everyone on the waitlist (same, verified email) gets 10%, rising to 20% at 100 waitlist sign-ups and 30% at 250 (`WAITLIST_TIERS`). Pick your own numbers.
- **No stacking**: the bigger of the two wins; a launch coupon replaces Stripe promo codes; annual billing and packs get no launch discount.
- **Features that don't exist yet** are on the page with a "Soon" tag instead of being sold as if they work: ad-to-landing-page analysis, product/pricing comparisons, advanced ad analysis, multiple ad variations, detailed segmentation, competitor comparisons, advanced exports, multiple brands, team workspaces, client-ready reports, bulk analysis, advanced audience customization. Pro and Agency today = more Crawlers + real priority processing (+ Agency's longer history).
- **Invites** (3 verified friends -> 1 extra full test) still work; they're no longer on the pricing card.
- Free trial reports: a **preview** (score, summary, top 3 reasons). Paying anything (plan or pack) unlocks the full report of that same test. It's a soft lock: the data is the user's own.

## Costs (estimate from the first real runs: ~$0.03 per 100 Crawlers, AI + browser)
| Plan | Price | Crawler cost if fully used | Before Stripe fees |
|---|---|---|---|
| Starter | $19 | ~$0.30 | ~98% margin |
| Growth | $49 | ~$1.50 | ~97% |
| Pro | $99 | ~$4.50 | ~95% |
| Agency | $199 | ~$12.00 | ~94% |

Careful: app tests run 3 crowds and send screenshots, and video tests send frames, so they cost several times more per Crawler than websites. Hosting (Railway worker, Vercel) and Stripe fees (~2.9% + 30¢) are extra.

## Stripe to-do (you, in the Stripe dashboard)
1. Webhook endpoint -> add the event **`checkout.session.completed`** (packs). Keep `customer.subscription.*` and `invoice.paid`.
2. Nothing else: prices are created by the code at checkout, and the launch coupons (`crawler-launch-10-3m`, `-20-3m`, `-30-3m`) are created automatically the first time someone qualifies.
3. Test in sandbox: a monthly plan, an annual plan, a pack (Crawlers appear on the dashboard), and an upgrade.

## Known gaps
- The founder Slack digest counts annual plans' MRR at the monthly price (it should be yearly / 12).
- Agency's "expanded history" is the dashboard list (100 instead of 20 tests); the My tests page already shows everything.
