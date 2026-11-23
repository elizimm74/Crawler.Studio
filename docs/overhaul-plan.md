# Crawler overhaul: audit + plan (2026-11-23)

The founder's brief: a full product overhaul (home, onboarding, engine, reports, dashboard, pricing,
accuracy, settings, security, SEO, mobile, testing). This is the Phase 1 audit and the order of work.

## Phase 1: what already exists (keep, don't rebuild)
- Next.js 15 + Tailwind v4 (web, Vercel) + Node worker (Railway, Playwright + Anthropic) sharing Supabase (Postgres queue, RLS, storage).
- Auth: email/password, Apple (Google not enabled yet). Sessions last 400 days; signed-in users land on /dashboard.
- Billing: Stripe subscriptions (Starter $25 / Growth $100 / Scale $250 a month = 1,000 / 10,000 / 30,000 simulated customers; Starter has no video/ad tests). Free = 1 starter test of 25 customers (+1 full 100-customer test for 3 verified invites). Limits enforced IN THE DATABASE (`start_test`), webhook idempotent, past-due blocks new tests.
- Engine: crawl (landing -> pricing -> signup, store mode -> product -> cart), optional explorer, research-based personas sampled in code, Haiku verdicts in batches with think-first fields, counting in code, Sonnet fixes with win-back counts, answer-quality checks, re-tests on the same crowd.
- Security already in place: SSRF guard on every browser request, open-redirect fix, input cleaning, CSP/HSTS, rate limits (30 analyses/hour, max 4 unfinished jobs), page content treated as data in prompts, secrets server/worker only, run costs hidden from users.
- Pages: /, /onboarding, /app (wizards), /run, /dashboard, /tests, /pricing, /example, /science, /accuracy, /tools/paywall-checker, /s/<token>, /admin/insights.

## Gaps vs the brief (and how each will be handled honestly)
| Brief item | Status | Plan |
|---|---|---|
| Hero "Would your customers actually buy?" + URL box | Home has the wordmark + button | Rebuild hero with URL box -> onboarding keeps the URL |
| "No credit card required" | TRUE (free plan has no card) | Show it |
| Free plan numbers everywhere | Must say 1 test x 25 customers | One source: `src/lib/plans.ts` |
| Onboarding: URL first, auto category, objective, personas, size, confirm | Type first, URL, optional details | URL first, category guessed from the address/page and editable, objective chips (sent to the prompts, cleaned server-side), size + balance on the confirm screen |
| Persona section on home | Customers section exists | Map to the engine's REAL mindsets; labelled synthetic |
| Problems by Critical/High/Medium/Low | Ranked fixes with counts | Derive priority from counted share of customers (code, not AI) |
| Mark fixes Not started / In progress / Completed | Not built | NEW table `fix_status` (migration, announced) |
| Settings (account, subscription, usage, security, deletion) | Not built | /settings; deletion keeps an anonymous usage record so the free test can't be reset |
| Notifications settings | No product emails exist | NOT added (would be a dead toggle) |
| Export | None | Print-to-PDF layout for reports |
| Upgrade between paid plans | Portal plan switching is OFF (prices aren't saved Stripe products) | Create Stripe Products/Prices, then enable switching |
| Accuracy page validation data | 0 real results submitted | Show the exact disclaimer; numbers only from `test_actuals` |
| 1,000-profile study of Crawler itself | | (a) REAL Playwright functional tests here; (b) a REAL Crawler run on crawler.studio with these 7 segments (needs the founder's API key/Mac, ~$1); labelled simulated. No invented results. |

## Order of work
1. Phase 2: plan numbers consistent everywhere, accuracy page honesty, broken links/dead buttons sweep.
2. Phase 3: home page per the brief.
3. Phase 5: dashboard sections (My websites, Simulations, Reports) + /settings.
4. Phase 4: report: decision breakdown with counts + %, priority groups, fix status, export.
5. Phase 6-8: mobile/perf audit, Playwright functional suite, fixes.
