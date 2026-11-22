// Crawler's plans: the ONE place prices live. The pricing page, Stripe Checkout (src/lib/stripe.ts)
// and the webhook all read this, so a price change is a one-line edit here.
//
// Founder's pricing (2026-11-22): monthly plans measured in SIMULATED CUSTOMERS.
// Each test uses as many customers as it simulates (you pick 100, 250, 500 or 1,000), and the
// allowance resets every billing month. Starter has no video/ad tests.
// The numbers MUST match plan_customers() and plan_has_ads() in migration 0014.

export type PlanId = "free" | "starter" | "growth" | "scale";
export type Plan = {
  id: PlanId;
  name: string;
  priceUsd: number; // per MONTH (0 = free)
  customers: number; // simulated customers per month (free: one starter test)
  ads: boolean; // video / ad / creator tests included
  note: string; // who it's for, in one line
  features: string[];
};

export const CUSTOMERS_PER_TEST = 100; // the usual test size
export const TEST_SIZES = [100, 250, 500, 1000] as const; // paid plans pick one per test
// Free accounts start with a smaller "starter" test; inviting friends unlocks the full size.
// These two numbers must match starter_customers() and referrals_needed() in migration 0007.
export const STARTER_CUSTOMERS = 25;
export const INVITES_TO_UNLOCK = 3;

const n = (x: number) => x.toLocaleString("en-US");

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    priceUsd: 0,
    customers: STARTER_CUSTOMERS,
    ads: false,
    note: "See what Crawler finds, once.",
    features: [
      `1 starter test (${STARTER_CUSTOMERS} simulated customers)`,
      `Invite ${INVITES_TO_UNLOCK} friends: +1 test, ${CUSTOMERS_PER_TEST} customers`,
      "Full report with ranked fixes",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    priceUsd: 25,
    customers: 1000,
    ads: false,
    note: "One launch a month: test, fix, re-test.",
    features: [`${n(1000)} simulated customers a month`, "About 10 tests of 100", "Websites, apps, games and stores", "AI explorer + re-tests"],
  },
  {
    id: "growth",
    name: "Growth",
    priceUsd: 100,
    customers: 10000,
    ads: true,
    note: "Bigger crowds, plus your ads and creator videos.",
    features: [`${n(10000)} simulated customers a month`, "Tests up to 1,000 customers each", "Video, ad and creator tests", "Everything in Starter"],
  },
  {
    id: "scale",
    name: "Scale",
    priceUsd: 250,
    customers: 30000,
    ads: true,
    note: "For studios and teams shipping all the time.",
    features: [`${n(30000)} simulated customers a month`, "Tests up to 1,000 customers each", "Video, ad and creator tests", "Everything in Growth"],
  },
];

// Paid plans renew monthly.
export const PERIOD = "month";

// "$25" or "$0"
export const priceLabel = (p: Plan) => `$${p.priceUsd}`;
// "1,000 customers a month" / "25 customers, once"
export const allowanceLabel = (p: Plan) => (p.priceUsd === 0 ? "no card needed" : `${n(p.customers)} customers a month`);
// "$2.50 per 100 customers"
export const per100Label = (p: Plan) => (p.priceUsd === 0 ? "free" : `$${((p.priceUsd / p.customers) * 100).toFixed(2)} per 100 customers`);
export const planName = (id: string) => PLANS.find((p) => p.id === id)?.name ?? (id === "launch" ? "Launch" : id === "studio" ? "Studio" : "Free");
