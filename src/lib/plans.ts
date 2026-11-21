// Crawler's plans: the ONE place prices live. The pricing page, Stripe Checkout (src/lib/stripe.ts)
// and the webhook all read this, so a price change is a one-line edit here.
//
// MONTHLY subscriptions (founder's decision, 2026-11-21). Each paid month adds `tests` to the
// account; unused tests roll over. Cancel any time in "Manage billing" (Stripe's page).
// Every test = 100 simulated customers and the full report.

export type Plan = {
  id: "free" | "launch" | "studio";
  name: string;
  priceUsd: number; // price per MONTH (0 = free)
  tests: number; // tests added each month (free: once)
  note: string; // who it's for, in one line
  features: string[];
};

export const CUSTOMERS_PER_TEST = 100;
// Free accounts start with a smaller "starter" test; inviting friends unlocks the full size.
// These two numbers must match starter_customers() and referrals_needed() in migration 0007.
export const STARTER_CUSTOMERS = 25;
export const INVITES_TO_UNLOCK = 3;

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    priceUsd: 0,
    tests: 1,
    note: "See what Crawler finds on your site.",
    features: [
      `1 starter test (${STARTER_CUSTOMERS} simulated customers)`,
      `Invite ${INVITES_TO_UNLOCK} friends: +1 test, ${CUSTOMERS_PER_TEST} customers`,
      "Full report with ranked fixes",
    ],
  },
  {
    id: "launch",
    name: "Launch",
    priceUsd: 19,
    tests: 5,
    note: "Test, fix, and re-test every month.",
    features: ["5 tests every month", "Unused tests roll over", `${CUSTOMERS_PER_TEST} simulated customers each`, "AI explorer tries your product", "Checks Reddit and review sites"],
  },
  {
    id: "studio",
    name: "Studio",
    priceUsd: 49,
    tests: 20,
    note: "For serial builders and small teams.",
    features: ["20 tests every month", "Unused tests roll over", `${CUSTOMERS_PER_TEST} simulated customers each`, "Everything in Launch"],
  },
];

// "$19" or "$0" (per month for paid plans: see PERIOD)
export const priceLabel = (p: Plan) => (p.priceUsd === 0 ? "$0" : `$${p.priceUsd}`);
// "$3.80 per test"
export const perTestLabel = (p: Plan) => (p.priceUsd === 0 ? "no card needed" : `$${(p.priceUsd / p.tests).toFixed(2)} per test`);

// Paid plans renew monthly.
export const PERIOD = "month";
