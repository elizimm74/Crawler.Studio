# Payments (Stripe): monthly plans measured in simulated customers

## The plans (src/lib/plans.ts + migration 0014, keep them in sync)
| Plan | Price | Simulated customers / month | Video + ad tests |
|---|---|---|---|
| Free | $0 | one 25-customer starter test (+1 full test for 3 verified invites) | no |
| Starter | $25/month | 1,000 | no |
| Growth | $100/month | 10,000 | yes |
| Scale | $250/month | 30,000 | yes |

Paid plans pick a test size (100, 250, 500 or 1,000). Each test uses that many customers. The allowance resets
every billing month (it is counted from the subscription's current period start) and does not carry over.
A test that fails on our side (status "error") doesn't count.

## How it works (plain English)
1. On `/pricing`, a signed-in person taps **Subscribe**. Our server (`/api/checkout`) asks Stripe for a checkout page in **subscription** mode. The price comes from `src/lib/plans.ts` on OUR server, never the browser. Someone who already has a plan is sent to Manage billing instead (no double charges).
2. The person pays on **Stripe's** page. Crawler never sees card details. Stripe charges the card every month by itself.
3. Stripe calls our **webhook** (`/api/stripe/webhook`). We check Stripe's signature first.
   `customer.subscription.created / updated / deleted` -> `sync_subscription` saves the plan, the status and the billing period. An older message never overwrites a newer one. `invoice.paid` is accepted and ignored (nothing to add: the allowance is counted from the period).
4. **Starting a test** (`start_test` in the database): checks the plan is active, the size is one of the four, it fits in what's left this month, and video/ad tests only on Growth/Scale. The browser only *asks*; the database decides.
5. A failed payment (status past_due) blocks NEW tests until the card works; the dashboard shows "payment failed" + **Update card**.
6. **Manage billing** (`/api/billing`) opens Stripe's customer portal: change card, invoices, cancel at the end of the paid month. Switching plans there is off: people cancel and subscribe to the other plan.

Files: `src/lib/stripe.ts`, `src/app/api/checkout/route.ts`, `src/app/api/billing/route.ts`, `src/app/api/stripe/webhook/route.ts`, `src/components/BuyButton.tsx`, `src/components/ManageBilling.tsx`, `src/components/dashboard/usePlan.tsx` (`SizePicker`, `AdsGate`), `supabase/migrations/0013_subscriptions.sql`, `0014_customer_plans.sql`, `0015_profile_plan_names.sql`.

## Switch it on (with your dad, he owns the Stripe account)
Start in the **Sandbox / Test mode**. Test cards don't move real money.

1. **Keys:** Stripe dashboard -> Developers -> API keys -> copy the **Secret key** (`sk_test_...`).
2. **Webhook:** Developers -> Webhooks -> Add destination
   - URL: `https://crawler-for-vercel.vercel.app/api/stripe/webhook`
   - Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` (`invoice.paid` may stay selected; it's ignored)
   - Copy the **Signing secret** (`whsec_...`).
3. Put them in the environment (NEVER in chat, never in git):
   - Vercel: Project -> Settings -> Environment Variables: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `SUPABASE_SECRET_KEY` (the webhook needs it to add tests). Then redeploy (upload the folder again).
   - On your Mac (optional): the same lines in `.env.local`.
4. The pricing buttons change from "Coming soon" to "Subscribe".
5. Test: subscribe with Stripe's test card `4242 4242 4242 4242`, any future date, any CVC. The dashboard rail should show "Customers this month: 1,000 left" (Starter) and "renews ...". Then open Manage billing and cancel: it should say "cancelled, active until ...".
   - Failed payment test: in the portal, change the card to `4000 0000 0000 0341` (attaches, then fails when charged), then in Stripe's dashboard open the subscription and use a test clock / "advance time" to the next month.

## Before real money (Live mode)
- Live keys + a live webhook destination (repeat steps 1-3 in Live mode). Finish Stripe's "required task past due" banner first.
- Vercel's free Hobby plan is non-commercial: switch to Pro before taking real payments.
- Add Terms (with the auto-renewal and refund rules), a Privacy page, and a support email. The pricing page already states: renews every month at the price shown until you cancel, cancel any time, keep the plan until the end of the paid month.
- Stripe -> Settings -> Billing -> Subscriptions and emails: turn on the emails for failed payments and upcoming renewals (Stripe sends them).
- Sales tax/VAT: consider Stripe Tax; ask an accountant when sales start.
