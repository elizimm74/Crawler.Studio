# Payments (Stripe): how it works and how to switch it on

## How it works (plain English)
1. On `/pricing`, a signed-in person taps **Buy Launch Pack** or **Buy Studio Pack**.
2. Our server (`/api/checkout`) asks Stripe for a checkout page. The price and the number of tests come from `src/lib/plans.ts` on OUR server, so nobody can change them in their browser.
3. The person pays on **Stripe's** page. Crawler never sees card details.
4. Stripe tells our server "this was paid" by calling the **webhook** (`/api/stripe/webhook`). We check Stripe's signature first; a fake call is rejected.
5. The webhook calls `record_purchase` in the database: it saves the purchase and adds the tests (5 or 20). The checkout id is unique, so if Stripe sends the same message twice, the tests are only added once.
6. The person lands on `/dashboard?paid=...` with a thank-you note. Bought tests never expire and always use the full 100 simulated customers.

Files: `src/lib/stripe.ts`, `src/app/api/checkout/route.ts`, `src/app/api/stripe/webhook/route.ts`, `src/components/BuyButton.tsx`, `supabase/migrations/0008_purchases.sql`. No Stripe package is installed (plain `fetch`).

## Switch it on (do this with your dad, he owns the Stripe account)
Start in **Test mode** (the toggle in the Stripe dashboard). Test cards don't move real money.

1. **Keys:** Stripe dashboard → Developers → API keys → copy the **Secret key** (`sk_test_...`).
2. **Webhook:** Developers → Webhooks → Add endpoint
   - URL: `https://YOUR-SITE/api/stripe/webhook` (your real deployed address)
   - Events: `checkout.session.completed` and `checkout.session.async_payment_succeeded`
   - Copy the **Signing secret** (`whsec_...`).
3. Put them in the environment (NEVER in chat, never in git):
   - On your Mac: `.env.local` → `STRIPE_SECRET_KEY=...` and `STRIPE_WEBHOOK_SECRET=...`
   - On Vercel: Project → Settings → Environment Variables (same two names), plus `SUPABASE_SECRET_KEY` (the webhook needs it to add tests).
4. Restart the site. The pricing buttons change from "Coming soon" to "Buy".
5. Test: buy a pack with Stripe's test card `4242 4242 4242 4242`, any future date, any CVC. Check the dashboard: tests left should go up by 5 or 20.

Testing the webhook on your Mac before deploying needs Stripe's CLI (`stripe listen --forward-to localhost:3000/api/stripe/webhook`). That's an install, so ask first; it's easier to test right after deploying.

## Before real money (switch to Live mode)
- Live keys + a live webhook endpoint (repeat steps 1-3 in Live mode).
- Stripe will ask your dad for business details and a bank account for payouts.
- Add a refund policy and terms to the site (Stripe and the app stores expect them).
- Sales tax/VAT: consider Stripe Tax; ask an accountant when sales start.
