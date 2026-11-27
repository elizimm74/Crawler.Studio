// Crawler's plans: the ONE place prices live. The pricing page, Stripe Checkout (src/lib/stripe.ts),
// the webhook and the dashboard all read this, so a price change is an edit here (plus the matching
// SQL function in the newest migration, which the database uses to enforce limits).
//
// Founder's FINAL pricing (2026-11-25), measured in CRAWLERS. 1 Crawler = 1 simulated customer.
//   Free trial  $0      25 Crawlers, once (one introductory simulation, a preview report)
//   Starter     $19/mo  1,000 Crawlers a month   (no Ad Analysis)
//   Growth      $49/mo  5,000 Crawlers a month   (Ad Analysis unlocks here)   <- most popular
//   Pro         $99/mo  15,000 Crawlers a month  (+ priority processing)
//   Agency      $199/mo 40,000 Crawlers a month  (+ highest priority, expanded history)
//   Enterprise  custom
// Plus PAY PER ANALYSIS (2026-11-26, founder: "get rid of the yearly plans; the only pricing should be
// the monthly plans and then paying per analysis"): buy ONE test, no subscription (no Ad Analysis).
// Annual billing is gone. Each test uses as many Crawlers as it simulates (you pick 100, 250, 500 or
// 1,000). Monthly allowances reset every month and don't carry over. A paid analysis never expires.
// The numbers MUST match plan_customers(), plan_has_ads(), plan_priority() (migration 0023) and
// pack_crawlers() / pack_price_cents() (migration 0024).

export type PlanId = "free" | "starter" | "growth" | "pro" | "agency";
export type PaidPlanId = Exclude<PlanId, "free">;
export type Feature = { text: string; soon?: boolean }; // soon = not built yet, shown as "Coming soon"
export type Plan = {
  id: PlanId;
  name: string;
  title: string; // the short promise on the card
  priceUsd: number; // per MONTH on monthly billing (0 = free)
  customers: number; // Crawlers per month (free: once)
  ads: boolean; // Ad Analysis (video, ad and creator tests)
  priority: 0 | 1 | 2; // 1 = priority processing, 2 = highest
  note: string; // who it's for, in one line
  includes?: string; // "Everything in Starter, plus:"
  features: Feature[];
  missing?: string; // a plain "not included" line (e.g. "No Ad Analysis")
  badge?: string; // "Most popular" / "Highest volume"
};

export const CUSTOMERS_PER_TEST = 100; // the usual test size
export const TEST_SIZES = [100, 250, 500, 1000] as const; // paid plans and packs pick one per test
// The free trial is one smaller "starter" test; inviting friends unlocks one full-size test.
// These two numbers must match starter_customers() and referrals_needed() in migration 0007.
export const STARTER_CUSTOMERS = 25;
export const INVITES_TO_UNLOCK = 3;

const n = (x: number) => x.toLocaleString("en-US");

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free trial",
    title: "Try Crawler",
    priceUsd: 0,
    customers: STARTER_CUSTOMERS,
    ads: false,
    priority: 0,
    note: "One introductory simulation, no card.",
    features: [
      { text: `${STARTER_CUSTOMERS} Crawlers, once` },
      { text: "One introductory simulation" },
      { text: "Customer feedback preview" },
      { text: "Purchase-intent preview" },
      { text: "Upgrade to unlock the full report" },
    ],
    missing: "No monthly credits. No Ad Analysis.",
  },
  {
    id: "starter",
    name: "Starter",
    title: "Test your website",
    priceUsd: 19,
    customers: 1000,
    ads: false,
    priority: 0,
    note: "For one launch at a time: test, fix, re-test.",
    features: [
      { text: "Website, store and app simulations" },
      { text: "Customer personas" },
      { text: "Purchase-intent analysis" },
      { text: "Conversion feedback" },
      { text: "Website friction detection" },
      { text: "Simulation history" },
    ],
    missing: "No Ad Analysis",
  },
  {
    id: "growth",
    name: "Growth",
    title: "Test your website and your ads",
    priceUsd: 49,
    customers: 5000,
    ads: true,
    priority: 0,
    note: "The full picture: the page and the ads that send people to it.",
    includes: "Everything in Starter, plus:",
    features: [
      { text: "Ad Analysis unlocked" },
      { text: "Video ad and creator testing" },
      { text: "Customer objections, ranked" },
      { text: "Advanced persona targeting" },
      { text: "Detailed conversion reports" },
      { text: "Ad-to-landing-page analysis", soon: true },
      { text: "Product and pricing comparisons", soon: true },
    ],
    badge: "Most popular",
  },
  {
    id: "pro",
    name: "Pro",
    title: "Test your whole funnel",
    priceUsd: 99,
    customers: 15000,
    ads: true,
    priority: 1,
    note: "For teams testing every launch, page and ad.",
    includes: "Everything in Growth, plus:",
    features: [
      { text: "Priority simulation processing" },
      { text: "Advanced Ad Analysis", soon: true },
      { text: "Multiple ad variations compared", soon: true },
      { text: "Detailed audience segmentation", soon: true },
      { text: "Competitor website comparisons", soon: true },
      { text: "Advanced reports and exports", soon: true },
    ],
  },
  {
    id: "agency",
    name: "Agency",
    title: "Test for every client",
    priceUsd: 199,
    customers: 40000,
    ads: true,
    priority: 2,
    note: "For agencies and studios running many brands.",
    includes: "Everything in Pro, plus:",
    features: [
      { text: "Highest processing priority" },
      { text: "Expanded analysis history" },
      { text: "Multiple brands and projects", soon: true },
      { text: "Team workspaces", soon: true },
      { text: "Client-ready reports", soon: true },
      { text: "Bulk website and ad analysis", soon: true },
      { text: "Advanced audience customization", soon: true },
    ],
    badge: "Highest volume",
  },
];

export const ENTERPRISE = {
  name: "Enterprise",
  title: "Custom pricing",
  features: ["Custom Crawler volumes", "Custom analysis requirements", "Dedicated support", "Custom team and agency workflows"],
};

// ---------- billing: MONTHLY only ----------
// Annual billing was removed (2026-11-26). "year" stays in the type only so old (sandbox) annual
// subscriptions can still be READ from Stripe and the database; nothing sells it any more.
export type Interval = "month" | "year";
export const PERIOD = "month";

// ---------- pay per analysis (no subscription) ----------
// Buy ONE analysis of a chosen size. Under the hood it adds that many Crawlers to your balance
// (the database's "pack" machinery: used after any monthly Crawlers, refunded if a test fails,
// never expires). Website, store and app tests only: Ad Analysis needs Growth or higher.
// Raised 2026-11-27 (founder: "raise the one-time simulations"): well above the monthly plans on
// purpose (1,000 customers once = $49 = a whole month of Growth; Starter gives 1,000 every month for
// $19), so anyone who tests more than once is better off on a plan.
// Edit here AND in pack_price_cents() (newest: migration 0025).
export type PackId = "test100" | "test250" | "test500" | "test1000";
export type Pack = { id: PackId; crawlers: number; priceUsd: number };
export const PACKS: Pack[] = [
  { id: "test100", crawlers: 100, priceUsd: 9 },
  { id: "test250", crawlers: 250, priceUsd: 19 },
  { id: "test500", crawlers: 500, priceUsd: 29 },
  { id: "test1000", crawlers: 1000, priceUsd: 49 },
];
export const PAY_PER_ANALYSIS = PACKS; // the clearer name; PACKS is kept for older imports
export const findPack = (id: unknown): Pack | null => PACKS.find((p) => p.id === id) ?? null;

// ---------- launch offer + waitlist discount ----------
// LAUNCH OFFER (2026-11-27, founder's conversion redesign): "Launch week: first 100 signups get a free
// 1,000-customer test." Granted BY THE DATABASE when an account's email is verified during the
// window (migration 0027: grant_launch_offer, launch_offer_config). KEEP THESE NUMBERS IN SYNC.
// It replaced the timed 30% launch-week discount (one offer, one message).
export const LAUNCH_OFFER = {
  name: "Launch week",
  freeCustomers: 1000,
  spots: 100,
  start: "2026-12-05T05:00:00Z", // Dec 5 00:00 US Eastern
  end: "2026-12-13T05:00:00Z", // Dec 12 23:59 US Eastern
};
// Waitlist discounts: up to 30% off the first 3 MONTHS of a monthly plan, for early waitlist members
// (same, verified email). The discount grows with the waitlist. Pay per analysis doesn't get it.
// The THRESHOLDS are a DEFAULT (the brief said "up to 30%, depending on signups"): edit freely.
export const PROMO_MONTHS = 3;
export const WAITLIST_TIERS = [
  { signups: 0, percent: 10 },
  { signups: 100, percent: 20 },
  { signups: 250, percent: 30 },
];
export function waitlistPercent(signups: number): number {
  let pct = 0;
  for (const tier of WAITLIST_TIERS) if (signups >= tier.signups) pct = tier.percent;
  return pct;
}
// The ONE discount someone gets at checkout (0 = none): the waitlist discount, monthly plans only.
export function launchDiscount(opts: { interval: Interval; onWaitlist: boolean; waitlistSize: number; now?: Date }): number {
  if (opts.interval !== "month") return 0;
  return opts.onWaitlist ? waitlistPercent(opts.waitlistSize) : 0;
}
// "$13.30": the monthly price after a discount, for the first PROMO_MONTHS months
export const discounted = (usd: number, percent: number) => (Math.round(usd * (100 - percent)) / 100).toFixed(2);

// ---------- labels ----------
export const money = (usd: number) => (Number.isInteger(usd) ? `$${usd}` : `$${usd.toFixed(2)}`);
// "$19" or "$0"
export const priceLabel = (p: Plan) => `$${p.priceUsd}`;
// "1,000 Crawlers a month" / "25 Crawlers, once"
export const allowanceLabel = (p: Plan) => (p.priceUsd === 0 ? `${n(p.customers)} Crawlers, once` : `${n(p.customers)} Crawlers / month`);
// "$1.90 per 100 Crawlers"
export const per100Label = (p: Plan) => (p.priceUsd === 0 ? "free" : `$${((p.priceUsd / p.customers) * 100).toFixed(2)} per 100 Crawlers`);
export const planName = (id: string) => {
  const pack = findPack(id);
  if (pack) return `${n(pack.crawlers)}-customer analysis`;
  return PLANS.find((p) => p.id === id)?.name ?? (id === "scale" ? "Scale" : id === "launch" ? "Launch" : id === "studio" ? "Studio" : id === "pack" ? "Pay per analysis" : "Free");
};
export const paidPlans = () => PLANS.filter((p) => p.priceUsd > 0);
