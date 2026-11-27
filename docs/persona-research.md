# Persona research notes

How Crawler's personas are told to behave, and where each rule comes from.
The rules live in `src/lib/behavior.ts`. Each persona only gets the rules that fit them.

There are two kinds of rules:
- **Facts:** from published studies, linked below.
- **Assumptions:** our best guesses, informed by those studies. These are labeled, and we should tune them as we learn more.

## Facts (from research)

| Rule | Applies to | Source |
|---|---|---|
| Visitors decide within ~10 seconds whether to stay, and they skim instead of reading | Everyone | [Nielsen Norman Group: How long do users stay on web pages?](https://nngroup.com/articles/how-long-do-users-stay-on-web-pages/) |
| The median landing page converts ~6.6% of visitors (SaaS ~3.8%, ecommerce ~4.2%) | Everyone | Unbounce Conversion Benchmark Report, Q4 2024 (41,000 pages), via [Apexure](https://www.apexure.com/blog/landing-page-conversion-rate-benchmarks-by-industry) |
| Forced account creation is a top reason people quit (~18-19% of abandoners) | Everyone | Baymard Institute, via [Amazon Pay](https://pay.amazon.com/blog/the-baymard-report-series-how-forcing-sign-ups-drives-down-sales) and [Baymard](https://baymard.com/blog/reduce-cart-abandonment) |
| Requiring a credit card for a trial cuts trial signups (e.g. ~10% vs ~2% of visitors) | Everyone | Totango data, via [Chargebee](https://www.chargebee.com/blog/credit-card-trials-credit-card-trials-go/) |
| Teens finish web tasks less often than adults (~55% vs 66%), dislike reading, want to *do* things, and are put off by "kid"/"youth" wording and glitzy design | Ages 13-17 | Nielsen Norman Group, *Teenagers on the Web* (38 teens, 23 sites), via [CNN](https://money.cnn.com/2005/01/31/technology/personaltech/Teenstudy/index.htm) and [mprove](https://mprove.de/script/04/nng/teenagers.html) |
| Teens are on YouTube and TikTok daily; nearly half are online "almost constantly" | Ages 13-17 | Pew Research Center (2024-2025), via [The Star](https://www.thestar.com.my/tech/tech-news/2025/12/10/survey-most-us-teens-use-youtube-and-tiktok-daily-some-almost-constantly) |
| ~87% of US teens own an iPhone; TikTok is the favorite app (46%) | Ages 13-17 | Piper Sandler *Taking Stock With Teens*, Fall 2025 (10,959 teens), via [MacTech](https://www.mactech.com/2025/10/09/survey-eighty-seven-percent-of-teens-report-they-own-an-iphone/amp/) |
| Before buying, most teens read comments (75%) and reviews (72%); they trust friends (31%) and family (28%) more than influencers (17%) | Ages 13-17 | Teen shopping survey, via [Net Influencer](https://www.netinfluencer.com/gen-z-discovers-brands-on-tiktok-but-trusts-influencers-less-than-friends-family-report-finds/) |
| Kids and teens mostly pay online with a parent's card | Ages 13-17 | Financial Basics Foundation survey, via [The New Daily](https://thenewdaily.com.au/finance/consumer/2018/08/12/teens-big-online-purchases-hurt-families) |

## Assumptions (our best guesses; tune these)

| Assumption | Value | Why |
|---|---|---|
| Share of visitors on a phone | Teens 85%, adults 60%, business buyers 35% | Teens are nearly all on phones (Pew, Piper Sandler) |
| Where visitors come from | Teens: mostly TikTok/YouTube/Instagram, then friends | Teen discovery happens on social media |
| Patience | ~10 sec / ~30 sec / a few minutes; teens skew shorter | NN/g: many leave in ~10 sec, and people who stay ~30 sec often stay minutes |
| Teens on a "card required" trial | Mostly a dead end | Most teens have no card of their own |

## Inner life (added 2026-11-18, `src/lib/mind.ts`; ALL ASSUMPTIONS)

| Trait | How it's rolled | Why |
|---|---|---|
| Why they're here | From where they arrived: search = looking or comparing; friend = trusted tip or politeness; ad = mostly curious | Intent differs by traffic source (a common marketing pattern, not a single study) |
| Need | Urgent / real / nice to have / none, weighted by why they're here | People with no real need rarely convert, however good the page |
| Burned before | About 1 in 4 people: forgotten free trial charge, unused paid app, email spam, product unlike photos | Past bad experiences make people look harder for proof and exits |
| Won over by | From mindset (e.g. skeptical = proof from people like them; busy = fewest steps) | Matches the mindset descriptions used across Crawler |
| Dealbreaker | Tight budget = hidden/high price or card upfront; low tech = confusing setup; needs approval = nothing to show the boss; else by mindset | Same |

Every customer now also writes a **first glance** (what they notice first) and a **thought** (their reasoning) BEFORE deciding, and follows 5 decision steps (first glance, need, dealbreaker, trust, decide). After every test, code checks the answers (`src/lib/quality.ts`): near-duplicate quotes or reasons, or a crowd that all decided the same, are flagged in the report.

## How the visit simulation works

For every persona, code (not AI) rolls the dice on:
- their device
- where they came from
- their patience

The AI then answers *as that person, on that visit*. A 15-year-old who taps a TikTok link on their phone with 10 seconds of patience only sees the phone screenshot of the first screen.

## Known gaps
- Most numbers are US-based.
- Some sources are older (the NN/g teen study is from 2005) or reported second-hand.
- Before quoting these publicly, check the original reports.

## Engine v2 (2026-11-27): population, say vs do, evidence, calibration

Code: `src/lib/population.ts`, `src/lib/intent.ts`, `src/lib/evidence.ts`, `src/lib/calibration.ts`,
`src/worker/calibrate.ts`. Bench: `scripts/engine-bench.cjs` (38 checks). Keep this table, the code and
`FACTS` / `ASSUMPTIONS` in `src/components/landing/Science.tsx` in sync.

### New facts (from research)
| Fact | Used for | Source |
| --- | --- | --- |
| 63% of US adults would cover a $400 emergency with cash or its equivalent; 37% would not (13% couldn't pay at all) | Budget mix for adults: tight 37% | Federal Reserve, *Economic Well-Being of U.S. Households in 2024* (SHED), May 2025 ([summary](https://www.federalreserve.gov/publications/2025-economic-well-being-of-us-households-in-2024-executive-summary.htm)) |
| Adopter categories: innovators 2.5%, early adopters 13.5%, early majority 34%, late majority 34%, laggards 16% | "Early adopter" mindset = 16% | Everett Rogers, *Diffusion of Innovations* (via [Lumen Learning](https://courses.lumenlearning.com/clinton-marketing/chapter/reading-diffusion-of-innovation/)) |
| About 1.5-3% of ecommerce visits end in a purchase | Base rate for the "buy" goal | 2025 benchmarks: [Triple Whale](https://www.triplewhale.com/blog/ecommerce-benchmarks), IRP Commerce, OptiMonk |
| Stated willingness to pay / act is reliably higher than real behavior (hypothetical bias); the bias grows with the amount | Separating "said yes" from "predicted to do it" | Murphy, Allen, Stevens & Weatherhead 2005, *Environmental and Resource Economics* 30(3) ([link](https://link.springer.com/article/10.1007/s10640-004-3332-z)); Morwitz, Steckel & Gupta 2007, *International Journal of Forecasting* 23(3) ([link](https://ideas.repec.org/a/eee/intfor/v23y2007i3p347-364.html)). We could NOT verify a single ratio from these papers, so none is quoted. |

### New assumptions (estimates; calibration corrects them as real results arrive)
| Assumption | Value |
| --- | --- |
| Budget split of the 63% who could cover $400 | okay 38 / comfortable 25 |
| Teen budgets | tight 60 / okay 35 / comfortable 5 |
| Other mindsets | skeptical 30 / price-sensitive 26 / busy 20 / impulse buyer 8 |
| Age weights | even 18-64; 65-74 at 85%, 75+ at 50% (approximates the Census age structure) |
| Spare money a month | tight $5-30, okay $30-120, comfortable $120-500; teens $0-15 / $15-50 / $50-150 |
| Spend without thinking | share of spare money: impulse 60%, busy/early adopter 30%, skeptical 20%, price-sensitive 15% |
| Patience in seconds | "10 seconds" = 6-14s, "30 seconds" = 20-45s, "a few minutes" = 90-300s |
| Follow-through of a stated yes | buy 35%, book a demo 30%, sign up / trial / download 50%, waitlist 60%; "maybe" 4%; "no" 0.2% |
| Discounts on a yes | impulse buyer with ≤15s patience or a tight budget x0.5; ≤15s patience x0.75; tight budget and paying today x0.6; needs approval x0.5; no real need x0.5; nice-to-have x0.75; burned by a trial before (trial goal) x0.85 |

### Calibration (how the assumptions get corrected)
- A founder adds a real conversion rate (+ visitors) under a report -> a `calibrate` job.
- The SAME crowd's per-person probabilities are shifted by one number (log-odds "delta") until they match the real rate. No AI is re-run.
- Global delta = weighted average of site deltas, one vote per account, results with < 200 visitors ignored, shrunk toward 0 as if 3 extra "no correction" results existed. It's applied once 5+ results back it.
- Published accuracy = leave-one-out: each result predicted by a fit that never saw it; "hit" = within ±2 percentage points.
- A re-test of a site you calibrated uses that site's own delta.
- Limits: real results are self-reported; a person could lie (one vote per account + admin exclusion limit the damage); the simulated traffic mix may differ from a site's real traffic mix; app and video tests are logged but not yet used to fit.
