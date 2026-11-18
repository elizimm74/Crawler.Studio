# Crawler strategy v2 (written 2026-11-18)

Status: a proposal for the founder to decide on. Everything marked "estimate" is my reasoning, not measured data.

## 1. The honest starting point
- Crawler works end to end for websites and apps. The AI parts have been run on the founder's Mac on a demo site only (cost about $0.03 per 100-customer test, $0.047 with the explorer). Real-site accuracy is still unproven.
- Anyone can ask a chat assistant "why wouldn't people buy this?" for free. So the product must be worth more than one AI opinion.
- Nothing here has real users yet. The plan below is built to get real users fast and to collect proof.

## 2. UVP (the one sentence)
**"Before you launch, 100 simulated customers try your app, site or store and show you exactly where people drop off and what to fix first."**

Three proofs that must be true on launch day, or the sentence is just marketing:
1. **It tries the real thing.** It opens the actual page, or walks the actual onboarding and paywall screens. It doesn't guess from pasted text.
2. **A crowd, counted in code.** Different ages, budgets, devices and patience. The numbers are counted in code, not made up by AI.
3. **A ranked fix list with the win-back count**, and a re-test to see if the fix helped (before/after).

What is NOT the promise: "predicts your sales." It shows buying intent from simulated customers. Say so everywhere.

## 3. MVP: what ships in the next 30 days
Keep (already built): onboarding in one screen, website test, app onboarding + paywall test, report, ranked fixes, share card, dashboard, invites, free headline checker, example report.

Must add before launch (in this order):
1. **Real-site proof run.** Run 20 real sites/apps (yours and volunteers') and publish what happened. Fix the crawler failures first.
2. **Deploy** (Vercel + a worker host) and **payments** (a parent opens Stripe). Packs: $19 / $49.
3. **Re-test + before/after** on the same crowd. This is what makes people come back and pay a second time.
4. **Predicted vs real**: ask each tester to enter their real conversion after launch. This feeds the `/accuracy` page and is the main thing a copycat can't fake.
5. **Analytics** (free visitor + funnel analytics) so you can see where visitors leave.

Cut or delay: Shopify engine (phase 3), more video, more dashboard polish, anything that isn't in the list above.

## 4. Market ladder (your order, with my notes)
| Phase | Who | Why it fits | What they pay for | Main risk |
|---|---|---|---|---|
| 1. Now | **Apps: paywalls + onboarding** | Paywall changes move revenue directly. Store-rule checks and the RevenueCat benchmark are already built. Indie app makers are reachable on X and in communities. | A re-test after each paywall change. | Needs screenshots, so more effort per test. |
| 2. Month 2-3 | **Web apps + websites** | Already works. Biggest audience. | Landing page and pricing page tests before launch. | Lowest willingness to pay when a free chat answer exists. Needs the proof from section 3. |
| 3. Month 3-5 | **Shopify, dropshipping, clothing stores** | Large number of small merchants who care about conversion rate. Product pages are repetitive, which suits a crowd test. | Product page and checkout-friction tests. | Many small merchants, low price tolerance, fast churn. Some dropship stores are deceptive; see below. |

My recommendation: do not start Shopify until phase 1 and 2 have paying users. Shopify is a different crawl (product, cart, checkout), so it is real engineering, not a copy change. A "coming soon / join the waitlist" tab is on the home page now, and the waitlist count will tell you whether it's worth building.

Market size: I have not verified any market-size numbers and won't quote them. Do it bottom-up instead: count how many apps with paywalls, and Shopify stores, you can find in 3 communities you can actually reach, multiply by a realistic price. That number is what investors will trust.

### What a Shopify test would look at (when built)
Home page, collection page, product page (photos, price, size guide, reviews), shipping cost and delivery time (shown early or late), returns and contact, cart, and the start of checkout. It stops before payment, always. It never enters card details, and never creates orders.
Honest-by-design rule: the report flags deceptive patterns such as fake countdown timers or fake "only 2 left" banners as a trust risk, and Crawler won't write fake reviews or urgency for anyone.

## 5. Outreach, in order
1. Your own audience (Runr users, your 15-year-old-founder story). Ask for 20 real tests, not signups.
2. Indie app makers on X and in app-founder communities: "Send me your paywall screenshots, I'll run a free test and post the (permissioned) result."
3. Then website founders, with the free headline checker and example report as the hook.
4. Shopify later, through store-owner communities, after phase 1-2 results exist.
Rules: real results only, with permission. No invented testimonials, no brand logos without written permission.

## 6. Scale: "15,000 users at a time"
"15,000 at a time" can mean three different things, and they cost very different amounts:

| Meaning | Can the current design handle it? | What to do |
|---|---|---|
| 15,000 **accounts** | Yes, with a paid database plan (free plan limits will bite first). | Upgrade Supabase before launch. |
| 15,000 **visitors online** | Yes. The website runs on Vercel's edge and is mostly static. | Add caching and rate limits. |
| 15,000 **tests running at once** | No, and nobody needs this. Each test opens a browser and makes many AI calls. | Use the queue (already built): users wait in line. |

Estimates (not measured):
- One worker machine can probably run a handful of tests in parallel; each browser test is memory-heavy. 20 machines x 4 tests could finish a few thousand tests per hour. Add machines as the queue grows.
- AI cost per test is the measured $0.03 (100 customers). 15,000 free starter tests of 25 customers should cost well under that each, roughly a few hundred dollars in total. The AI provider's rate limits are the real ceiling, so apply for a higher limit tier before a big launch.
- Already built and protecting you: max 4 unfinished jobs per user, 30 analyses/hour per user, the server (not the browser) decides test size, a worker heartbeat with retries.
Still to build for scale: worker autoscaling, a global daily spend cap with a kill switch, an anonymous-crawl abuse design (needed for the "try before sign-up" idea), monitoring and alerts, and a load test.

## 7. Design v7: black and white, simple, Gen Z
Done in code today: page is black, text is white, cards and paper sheets are white with black text, one accent = white (black inside cards), the torn-paper edges and the claw scratches stay. The animated claws are now white on black (and the intro is black claws tearing a white page open). I read "claude animation built around it" as "claws animation"; tell me if you meant something else.
Rules: no gradients, no color except status dots, big heavy lowercase wordmark, small mono labels, generous space.

## 8. 30-day plan
- Week 1: real-site proof run (20 sites/apps), fix crawler failures, deploy, analytics, enable leaked-password protection, revoke Apple key GQQQ8DZAFN.
- Week 2: parent opens Stripe, packs go live, re-test + before/after.
- Week 3: private beta with 20-30 app/web founders, collect predicted-vs-real, fix the top 5 complaints.
- Week 4: public launch (the founder on camera, real results), Shopify waitlist open.
Decide at day 30 from numbers: visitors to starts, starts to finished tests, finished tests to paid. If a step is under about half of what you hoped, fix that step before spending on promotion.

## 9. What I need from the founder
1. Confirm the phase order (apps first, then web, then Shopify).
2. Confirm "claws animation" is what you meant.
3. A parent for Stripe, Vercel and the worker host.
4. Your real social handle (the videos still say the placeholder `@crawler.app`).
5. 20 people (apps or sites) who'll test for free.
