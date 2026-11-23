# Crawler usability program: 1,000 potential customers (2026-11-23)

Nobody real has tested this. This document keeps three kinds of evidence apart, and every row says which kind it is:

| Label | What it is | How much to trust it |
|---|---|---|
| **AUTOMATED** | A real browser test run by `npm run sitecheck` (Playwright). It clicks, types and measures. | Facts about whether the site *works*. Says nothing about whether people *like* it. |
| **SIMULATED (to run)** | Crawler's own AI customers testing crawler.studio, one run per segment below. | A strong hint, like any Crawler report. **Not run yet**: it needs the Anthropic key (founder's Mac or the live site). |
| **HYPOTHETICAL** | Written by Claude from a careful walkthrough of the pages, imagining each segment. | An informed guess. Use it as a checklist, not as data. |

No row below is from a real person. No numbers of "people who liked it" are claimed anywhere.

## The 1,000 profiles

| Segment | Profiles | Crawler audience to use (Customer minds) | Mix of attitudes to include |
|---|---:|---|---|
| Gen Z entrepreneurs | 200 | "Gen Z creators" preset, ages 16-24, budget tight/okay | impulse, skeptical, price-sensitive, low patience |
| Shopify and clothing brand owners | 200 | "Small business owners" preset, industry = retail/ecommerce | busy, price-sensitive, low tech comfort for 1 in 3 |
| SaaS founders | 150 | "Solo SaaS founders" preset | skeptical, early adopter, comparison shoppers |
| Independent app developers | 150 | "Solo SaaS founders" preset, role = developer | skeptical of AI claims, high tech comfort |
| Game developers | 100 | "Roblox and game players" preset ages 16+ (or a saved mind: game devs) | impatient, price-sensitive |
| Marketing agencies | 100 | "Small business owners" preset, role = agency, needs approval | busy, need proof for clients |
| Non-technical business owners | 100 | "Small business owners" preset, tech comfort low | confused by jargon, skeptical |

### How to run the SIMULATED part (about $1-2 in total, on the live site)
1. Sign in on crawler.studio as the admin account (no limits).
2. For each segment: New test → `crawler.studio` → objectives "Would customers buy?" + "Is the value clear?" + "Is my price reasonable?" → pick the audience above (save it as a Customer mind so re-tests use the same crowd) → size 1,000 for SaaS/Shopify/Gen Z (200 each is enough statistically: use 250), 100-250 for the others.
3. Export each report as PDF (Download PDF) and paste the top 3 problems + fixes into the table at the bottom.
4. After changing the site, re-test each segment (same customers) and record who changed their mind.

## Results by question

Severity: **Critical** = blocks the core path · **High** = loses many people · **Medium** = some friction · **Low** = polish.

| # | Question | Segment | Scenario | Expected | Observed | Kind | Result | Severity | Fix |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Understand what Crawler does | All | Land on the home page on a phone | The headline + one line explain it | "Would your customers actually buy?" + subheadline visible without scrolling on iPhone 15 / Pixel 7; demo picture below | AUTOMATED (layout) + HYPOTHETICAL (understanding) | Pass | - | - |
| 1b | Understand what Crawler does | Non-technical owners | Read "AI-powered customer simulations" | Plain words | "simulation" and "personas" may be unfamiliar | HYPOTHETICAL | Risk | Medium | The demo picture shows it; consider "AI shoppers try your site" as a secondary line. Test with the SIMULATED run first. |
| 2 | Main value proposition | SaaS / app devs | Skim hero + sample report | "Find what to fix before launch" | Ranked fixes with win-back counts in the sample report tab | HYPOTHETICAL | Pass | - | - |
| 3 | Identify the first action | All | Look for what to do first | One obvious box + button | URL box + "Test My Website Free" in the hero and the final CTA; flows tested | AUTOMATED | Pass | - | - |
| 4 | Submit a website | All | Type a bad address, then a good one | Clear error; good one moves on with the address kept | Bad: error shown, stays on page. Good: /onboarding?url=example.com with the field filled | AUTOMATED | Pass | - | - |
| 4b | Submit a website | Shopify owners | Store with bot protection | Honest message | URL checker says "This site blocks quick checks… some sites with bot protection can't be tested" | AUTOMATED (code path) | Pass | Medium | Real bot-protected stores (Allbirds, Gymshark) still can't be added to cart: documented. |
| 4c | Submit a website | App / game devs | No website | A way forward | "No website? Test something else" chips switch to app / game / video; flow tested | AUTOMATED | Pass | - | - |
| 5 | Understand pricing | Price-sensitive (Gen Z, owners) | Open /pricing | Exact numbers, what's free, what resets | Every card lists billing, customers per month/test, tests per month, resets, video/ads, extra usage; numbers checked against code | AUTOMATED | Pass | - | - |
| 5b | Understand pricing | Gen Z | "$25 for 1,000 simulated customers" | Know how many tests that is | "about 10 of 100, or 1 of 1,000" shown | AUTOMATED | Pass | Low | - |
| 6 | Trust the methodology | Skeptical SaaS founders, agencies | Look for proof it works | Sources + honest limits + real accuracy data | /science (5 papers with limits), /accuracy (6-part explanation + validation table). **There are no real results yet**, and the page says so | AUTOMATED (pages load) + HYPOTHETICAL | Partial | High | Needs real data: ask the first users to enter real conversion rates (ActualBox); run Crawler on published A/B tests (accuracy lab, not built). |
| 7 | Interpret a report | Non-technical owners | Open the sample report | Know the score, the top problem, the first fix | Decisions with counts + %, problems by Critical/High/Medium/Low, fixes with "Problem / Why it matters / Do this" | AUTOMATED (renders) + HYPOTHETICAL | Pass | Medium | The "maybes" wording ("+9 of 23 maybes") may confuse; consider "+9 people" with a tooltip. |
| 8 | Consider paying | Gen Z entrepreneurs | Free test → pricing | Free value first, then a cheap plan | Free = 1 test of 25 customers, no card; Starter $25 | HYPOTHETICAL | Risk | High | 25 customers may feel thin; the invite unlock (3 friends) is the upgrade path. Watch /admin/insights: free → paid rate per source. |
| 9 | What makes them hesitate | Agencies, skeptics | Before signing up | Proof, data handling | No real testimonials or logos (on purpose: nobody has used it yet) | HYPOTHETICAL | Risk | High | Add real testimonials and logos ONLY with written permission once real users exist. |
| 10 | What makes them abandon | Impatient Gen Z | Wait for results | Progress + time estimate | Live progress screens exist; crawl hard limit 120s; "a few minutes" promised | AUTOMATED (limits in code) + HYPOTHETICAL | Partial | Medium | The "Reading your site" checklist is timer-based, not real progress: make it real. |
| 10b | What makes them abandon | Everyone | Worker down | Honest message | Wizard says the test machine isn't running after ~60s queued | AUTOMATED (code path) | Pass | Critical if the worker is down | Keep the Railway worker on (Hobby plan, 2 GB). |

## AUTOMATED run (2026-11-23, local production build)
`npm run sitecheck` → **351 / 351 passed**: 11 pages × 5 devices (iPhone 15, Pixel 7, iPad, 1440 laptop, 2560 monitor) for loading, sideways scroll, console errors, server errors, images, tap targets; SEO (one h1, unique titles, descriptions); every internal link; 13 flows (hero validation, onboarding steps, app switch, sample-report tabs and filter, FAQ, demo labels, pricing numbers, fix tracker, PDF, copy prompt, SSRF refusal, private APIs need sign-in). It found and fixed: report pages had no h1, sign-in/sign-up reused the home title, small paper links on /science.
Not covered by automation here: signed-in pages with real accounts (needs Supabase from the founder's machine), real Stripe checkout, real AI runs.

## SIMULATED results (to fill in after running)
| Segment | Simulated customers | Would buy | Maybe | No | #1 problem | #1 fix |
|---|---:|---:|---:|---:|---|---|
| (not run yet) | | | | | | |
