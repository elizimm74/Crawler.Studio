# Payments (Stripe): monthly subscriptions

## How it works (plain English)
1. On `/pricing`, a signed-in person taps **Subscribe** on Launch ($19/month, 5 tests) or Studio ($49/month, 20 tests).
2. Our server (`/api/checkout`) asks Stripe for a checkout page in **subscription** mode. The price and the number of tests come from `src/lib/plans.ts` on OUR server, so nobody can change them in their browser. Someone who already has a plan is sent to Manage billing instead (no double charges).
3. The person pays on **Stripe's** page. Crawler never sees card details. Stripe then charges the card **every month** by itself.
4. Stripe tells our server what happened by calling the **webhook** (`/api/stripe/webhook`). We check Stripe's signature first; a fake call is rejected.
   - `invoice.paid` (the first month or a renewal) -> `record_invoice` adds that month's tests (5 or 20). The invoice id is unique, so a repeated message never adds tests twice.
   - `customer.subscription.created / updated / deleted` -> `sync_subscription` saves the status: active, past_due (a payment failed; Stripe retries the card for a while), cancelled at month end, or ended. An older message can never overwrite a newer one.
5. The person lands on `/dashboard?paid=...` with a thank-you note. The dashboard rail shows "Launch: renews Dec 21" (or "payment failed, update your card", or "cancelled, active until ...") and a **Manage billing** link.
6. **Manage billing** (`/api/billing`) opens Stripe's customer portal: change card, download invoices, cancel. Cancelling stops the plan at the END of the paid month. Switching plans is turned off there: people cancel and subscribe to the other plan.
7. Unused tests **roll over** and stay after cancelling (they were paid for). A failed payment adds no tests.

Files: `src/lib/stripe.ts`, `src/app/api/checkout/route.ts`, `src/app/api/billing/route.ts`, `src/app/api/stripe/webhook/route.ts`, `src/components/BuyButton.tsx`, `src/components/ManageBilling.tsx`, `supabase/migrations/0013_subscriptions.sql` (0008 = the old one-time packs; its table `purchases` now also stores paid invoices). No Stripe package is installed (plain `fetch`). The billing-portal settings are created automatically the first time someone opens Manage billing, if the Stripe account has none.

## Switch it on (with your dad, he owns the Stripe account)
Start in the **Sandbox / Test mode**. Test cards don't move real money.

1. **Keys:** Stripe dashboard -> Developers -> API keys -> copy the **Secret key** (`sk_test_...`).
2. **Webhook:** Developers -> Webhooks -> Add destination
   - URL: `https://crawler-for-vercel.vercel.app/api/stripe/webhook`
   - Events (select these 4): `invoice.paid`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the **Signing secret** (`whsec_...`).
3. Put them in the environment (NEVER in chat, never in git):
   - Vercel: Project -> Settings -> Environment Variables: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `SUPABASE_SECRET_KEY` (the webhook needs it to add tests). Then redeploy (upload the folder again).
   - On your Mac (optional): the same lines in `.env.local`.
4. The pricing buttons change from "Coming soon" to "Subscribe".
5. Test: subscribe with Stripe's test card `4242 4242 4242 4242`, any future date, any CVC. The dashboard's tests-left should go up by 5 or 20 and the rail should say "renews ...". Then open Manage billing and cancel: it should say "cancelled, active until ...".
   - Failed payment test: in the portal, change the card to `4000 0000 0000 0341` (attaches, then fails when charged), then in Stripe's dashboard open the subscription and use a test clock / "advance time" to the next month.

## Before real money (Live mode)
- Live keys + a live webhook destination (repeat steps 1-3 in Live mode). Finish Stripe's "required task past due" banner first.
- Vercel's free Hobby plan is non-commercial: switch to Pro before taking real payments.
- Add Terms (with the auto-renewal and refund rules), a Privacy page, and a support email. The pricing page already states: renews every month at the price shown until you cancel, cancel any time, keep the plan until the end of the paid month.
- Stripe -> Settings -> Billing -> Subscriptions and emails: turn on the emails for failed payments and upcoming renewals (Stripe sends them).
- Sales tax/VAT: consider Stripe Tax; ask an accountant when sales start.
